import subprocess
import json
import numpy as np
import onnxruntime as ort
from pathlib import Path

VIDEO = str(
    Path.home() /
    "storage/downloads/Why Your Fiber Supplement Might Be Causing You Bloating.mp4"
)

MODEL = "pipeline/models/android/version-RFB-320.onnx"

W, H = 320, 240
FPS = 5
CONFIDENCE = 0.50
SMOOTHING = 0.20

session = ort.InferenceSession(
    MODEL,
    providers=["XnnpackExecutionProvider", "CPUExecutionProvider"]
)

input_name = session.get_inputs()[0].name

cmd = [
    "ffmpeg",
    "-hide_banner",
    "-loglevel", "error",
    "-i", VIDEO,
    "-vf", f"fps={FPS},scale={W}:{H}",
    "-f", "rawvideo",
    "-pix_fmt", "rgb24",
    "pipe:1"
]

proc = subprocess.Popen(
    cmd,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    bufsize=W * H * 3 * 4
)

frame_size = W * H * 3
smoothed = None
frame_idx = 0
detected = 0

print("===== CONTINUOUS FACE TRACKING =====")
print("FPS:", FPS)
print("Confidence threshold:", CONFIDENCE)

while True:
    raw = proc.stdout.read(frame_size)

    if len(raw) != frame_size:
        break

    img = np.frombuffer(
        raw,
        dtype=np.uint8
    ).reshape(H, W, 3).astype(np.float32)

    img = (img - 127.0) / 128.0
    img = np.transpose(img, (2, 0, 1))
    img = np.expand_dims(img, 0).astype(np.float32)

    scores, boxes = session.run(
        None,
        {input_name: img}
    )

    scores = scores[0]
    boxes = boxes[0]

    face_scores = scores[:, 1]
    idx = int(np.argmax(face_scores))
    confidence = float(face_scores[idx])

    timestamp = frame_idx / FPS

    if confidence >= CONFIDENCE:
        detected += 1

        x1, y1, x2, y2 = [
            float(x) for x in boxes[idx]
        ]

        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2

        if smoothed is None:
            smoothed = np.array([cx, cy], dtype=np.float32)
        else:
            current = np.array([cx, cy], dtype=np.float32)
            smoothed = (
                SMOOTHING * current
                + (1.0 - SMOOTHING) * smoothed
            )

        print(json.dumps({
            "frame": frame_idx,
            "time": round(timestamp, 3),
            "confidence": round(confidence, 5),
            "bbox": [
                round(x1, 5),
                round(y1, 5),
                round(x2, 5),
                round(y2, 5)
            ],
            "face_center": [
                round(float(smoothed[0]), 5),
                round(float(smoothed[1]), 5)
            ]
        }))

    else:
        print(json.dumps({
            "frame": frame_idx,
            "time": round(timestamp, 3),
            "confidence": round(confidence, 5),
            "detected": False
        }))

    frame_idx += 1

proc.stdout.close()
proc.wait()

print("\n===== TRACKING SUMMARY =====")
print("Frames:", frame_idx)
print("Detected:", detected)

if frame_idx:
    print(
        "Detection rate:",
        round(detected / frame_idx * 100, 2),
        "%"
    )

print("Status:", "PASS" if detected > 0 else "FAIL")
