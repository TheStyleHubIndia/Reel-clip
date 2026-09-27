#!/usr/bin/env python3

import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import onnxruntime as ort


# ============================================================
# CONFIG
# ============================================================

VIDEO = Path("test_clips_40/clip_01.mp4")

MODEL = Path("pipeline/models/android/version-RFB-320.onnx")
OUTPUT = Path("test_clips_40_9x16/clip_01_9x16.mp4")

DETECTION_FPS = 5.0
CONFIDENCE_THRESHOLD = 0.50

# EMA smoothing. Lower = smoother, higher = more responsive.
EMA_ALPHA = 0.18

# Ignore a detection if it jumps too far from the previous valid center.
MAX_CENTER_JUMP = 0.30

# Keep previous crop position during short detector failures.
MAX_HOLD_SECONDS = 1.5

# Output.
OUT_W = 1080
OUT_H = 1920


# ============================================================
# HELPERS
# ============================================================

def die(message):
    print(json.dumps({
        "status": "ERROR",
        "error": message
    }))
    sys.exit(1)


def run(cmd):
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    if result.returncode != 0:
        print(result.stderr[-4000:])
        die("Command failed")
    return result


def probe_video():
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries",
        "stream=width,height,r_frame_rate,duration",
        "-of", "json",
        str(VIDEO)
    ]

    result = run(cmd)
    data = json.loads(result.stdout)

    stream = data["streams"][0]

    width = int(stream["width"])
    height = int(stream["height"])

    duration = float(stream.get("duration") or 0)

    return width, height, duration


def preprocess_rgb(raw):
    img = np.frombuffer(raw, dtype=np.uint8)

    expected = 320 * 240 * 3

    if len(img) != expected:
        return None

    img = img.reshape((240, 320, 3)).astype(np.float32)

    img = (img - 127.0) / 128.0

    img = np.transpose(img, (2, 0, 1))

    img = np.expand_dims(img, axis=0)

    return img


def detect_frame(session, raw):
    tensor = preprocess_rgb(raw)

    if tensor is None:
        return None

    input_name = session.get_inputs()[0].name

    scores, boxes = session.run(
        None,
        {input_name: tensor}
    )

    scores = scores[0]
    boxes = boxes[0]

    # Class 1 = face.
    face_scores = scores[:, 1]

    idx = int(np.argmax(face_scores))

    confidence = float(face_scores[idx])

    if confidence < CONFIDENCE_THRESHOLD:
        return {
            "detected": False,
            "confidence": confidence
        }

    box = boxes[idx]

    x1, y1, x2, y2 = [
        float(max(0.0, min(1.0, v)))
        for v in box
    ]

    if x2 <= x1 or y2 <= y1:
        return {
            "detected": False,
            "confidence": confidence
        }

    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0

    return {
        "detected": True,
        "confidence": confidence,
        "bbox": [x1, y1, x2, y2],
        "center": [cx, cy]
    }


# ============================================================
# FACE TRACKING
# ============================================================

def collect_tracking(width, height, duration, session):

    frame_count = max(1, int(math.ceil(duration * DETECTION_FPS)))

    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel", "error",
        "-i", str(VIDEO),
        "-vf",
        f"fps={DETECTION_FPS},scale=320:240:flags=bilinear",
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "-"
    ]

    proc = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    raw_size = 320 * 240 * 3

    detections = []

    previous = None
    previous_time = None

    frame_index = 0

    while True:

        raw = proc.stdout.read(raw_size)

        if len(raw) != raw_size:
            break

        t = frame_index / DETECTION_FPS

        detection = detect_frame(session, raw)

        if detection and detection.get("detected"):

            cx, cy = detection["center"]

            # Reject impossible jumps.
            if previous is not None:

                jump = math.sqrt(
                    (cx - previous[0]) ** 2 +
                    (cy - previous[1]) ** 2
                )

                if jump > MAX_CENTER_JUMP:
                    detection["detected"] = False
                    detection["rejected_jump"] = True

            if detection.get("detected"):

                if previous is None:
                    smooth_x = cx
                    smooth_y = cy
                else:
                    smooth_x = (
                        EMA_ALPHA * cx +
                        (1.0 - EMA_ALPHA) * previous[0]
                    )

                    smooth_y = (
                        EMA_ALPHA * cy +
                        (1.0 - EMA_ALPHA) * previous[1]
                    )

                previous = [smooth_x, smooth_y]
                previous_time = t

                detections.append({
                    "time": t,
                    "x": smooth_x,
                    "y": smooth_y,
                    "confidence": detection["confidence"],
                    "detected": True
                })

            else:
                detections.append({
                    "time": t,
                    "detected": False
                })

        else:
            detections.append({
                "time": t,
                "detected": False
            })

        frame_index += 1

        print(
            json.dumps({
                "frame": frame_index - 1,
                "time": round(t, 3),
                **detection
            }),
            flush=True
        )

    proc.stdout.close()
    proc.wait()

    return detections


# ============================================================
# BUILD SMOOTH CROP PATH
# ============================================================

def build_crop_path(detections, width, height, duration):

    # 9:16 crop from source.
    crop_h = height

    crop_w = int(round(height * 9.0 / 16.0))

    # FFmpeg likes even dimensions.
    crop_w -= crop_w % 2

    if crop_w <= 0 or crop_w > width:
        die(
            f"Invalid 9:16 crop: source={width}x{height}, "
            f"crop={crop_w}x{crop_h}"
        )

    valid = [
        d for d in detections
        if d.get("detected")
    ]

    if not valid:
        die("No usable face detections")

    # Convert detection centers to source crop X.
    samples = []

    for d in valid:

        cx = d["x"]

        desired_x = (
            cx * width -
            crop_w / 2.0
        )

        max_x = width - crop_w

        desired_x = max(
            0.0,
            min(max_x, desired_x)
        )

        samples.append(
            (d["time"], desired_x)
        )

    # Interpolate crop X at 30 FPS.
    output_fps = 30.0
    total_frames = int(math.ceil(duration * output_fps))

    times = np.array(
        [x[0] for x in samples],
        dtype=np.float64
    )

    positions = np.array(
        [x[1] for x in samples],
        dtype=np.float64
    )

    frame_times = np.arange(
        total_frames,
        dtype=np.float64
    ) / output_fps

    # Linear interpolation.
    crop_positions = np.interp(
        frame_times,
        times,
        positions
    )

    # Second smoothing pass.
    smoothed = np.zeros_like(crop_positions)

    smoothed[0] = crop_positions[0]

    alpha = 0.20

    for i in range(1, len(crop_positions)):

        smoothed[i] = (
            alpha * crop_positions[i] +
            (1.0 - alpha) * smoothed[i - 1]
        )

    # Clamp.
    smoothed = np.clip(
        smoothed,
        0,
        width - crop_w
    )

    return crop_w, crop_h, smoothed, output_fps


# ============================================================
# FFMPEG SENDCMD
# ============================================================

def create_sendcmd(crop_positions, fps, crop_filter_name):

    tmp = tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".cmd",
        prefix="reframe_",
        delete=False
    )

    path = Path(tmp.name)

    for frame, x in enumerate(crop_positions):

        timestamp = frame / fps

        # Integer crop X prevents subpixel crop errors.
        x_int = int(round(x))

        tmp.write(
            f"{timestamp:.6f} "
            f"{crop_filter_name} x {x_int};\n"
        )

    tmp.close()

    return path


# ============================================================
# RENDER
# ============================================================

def render(crop_w, crop_h, crop_positions, fps):

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    crop_name = "dynamiccrop"

    cmd_file = create_sendcmd(
        crop_positions,
        fps,
        crop_name
    )

    # Escape command filename for FFmpeg filter syntax.
    cmd_path = str(cmd_file).replace("\\", "/").replace(":", "\\:")

    vf = (
        f"sendcmd=f='{cmd_path}',"
        f"crop@{crop_name}={crop_w}:{crop_h}:0:0,"
        f"scale={OUT_W}:{OUT_H}:flags=lanczos,"
        f"setsar=1"
    )

    command = [
        "ffmpeg",
        "-hide_banner",
        "-y",
        "-i", str(VIDEO),

        "-vf", vf,

        "-map", "0:v:0",
        "-map", "0:a?",

        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",

        "-c:a", "aac",
        "-b:a", "128k",

        "-movflags", "+faststart",

        str(OUTPUT)
    ]

    print("\n===== FFMPEG 9:16 RENDER =====")

    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    try:
        cmd_file.unlink()
    except Exception:
        pass

    if result.returncode != 0:
        print(result.stderr[-8000:])
        die("9:16 FFmpeg render failed")

    return result


# ============================================================
# VERIFY
# ============================================================

def verify_output():

    if not OUTPUT.exists():
        die("Output file was not created")

    if OUTPUT.stat().st_size < 10000:
        die("Output file is suspiciously small")

    command = [
        "ffprobe",
        "-v", "error",
        "-show_entries",
        "stream=index,codec_type,codec_name,width,height,duration",
        "-show_entries",
        "format=duration,size",
        "-of", "json",
        str(OUTPUT)
    ]

    result = run(command)

    data = json.loads(result.stdout)

    streams = data.get("streams", [])

    video_stream = next(
        (s for s in streams if s.get("codec_type") == "video"),
        None
    )

    audio_stream = next(
        (s for s in streams if s.get("codec_type") == "audio"),
        None
    )

    if not video_stream:
        die("No video stream in output")

    width = int(video_stream["width"])
    height = int(video_stream["height"])

    if width != OUT_W or height != OUT_H:
        die(
            f"Wrong output dimensions: "
            f"{width}x{height}, expected {OUT_W}x{OUT_H}"
        )

    return {
        "width": width,
        "height": height,
        "video_codec": video_stream.get("codec_name"),
        "audio_codec": (
            audio_stream.get("codec_name")
            if audio_stream else None
        ),
        "size_bytes": OUTPUT.stat().st_size,
        "path": str(OUTPUT)
    }


# ============================================================
# MAIN
# ============================================================

def main():

    print("===== ANDROID 9:16 AUTO-REFRAME =====")

    if not VIDEO.exists():
        die(f"Input video not found: {VIDEO}")

    if not MODEL.exists():
        die(f"ONNX model not found: {MODEL}")

    width, height, duration = probe_video()

    print(f"Input: {width}x{height}")
    print(f"Duration: {duration:.2f}s")
    print(f"Detection FPS: {DETECTION_FPS}")
    print(f"Confidence threshold: {CONFIDENCE_THRESHOLD}")
    print(f"EMA alpha: {EMA_ALPHA}")

    session = ort.InferenceSession(
        str(MODEL),
        providers=[
            "XnnpackExecutionProvider",
            "CPUExecutionProvider"
        ]
    )

    print("\n===== FACE TRACKING =====")

    detections = collect_tracking(
        width,
        height,
        duration,
        session
    )

    detected = sum(
        1 for d in detections
        if d.get("detected")
    )

    print("\n===== TRACKING SUMMARY =====")
    print(f"Frames: {len(detections)}")
    print(f"Detected: {detected}")

    if detections:
        print(
            f"Detection rate: "
            f"{detected / len(detections) * 100:.1f}%"
        )

    if detected == 0:
        die("No face detected")

    print("\n===== BUILDING 9:16 CROP PATH =====")

    crop_w, crop_h, crop_positions, output_fps = build_crop_path(
        detections,
        width,
        height,
        duration
    )

    print(
        f"Crop: {crop_w}x{crop_h} "
        f"({crop_w / crop_h:.4f}:1)"
    )

    print(
        f"Output: {OUT_W}x{OUT_H} "
        f"(9:16)"
    )

    print("\n===== RENDERING =====")

    render(
        crop_w,
        crop_h,
        crop_positions,
        output_fps
    )

    result = verify_output()

    print("\n===== AUTO-REFRAME RESULT =====")
    print(json.dumps(result, indent=2))

    print("\nSTATUS: PASS")


if __name__ == "__main__":
    main()
