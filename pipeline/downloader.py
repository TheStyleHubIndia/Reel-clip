#!/usr/bin/env python3
"""
Video Downloader using yt-dlp and direct HTTP stream downloader.
Downloads YouTube, YouTube Shorts, web media, or direct video streams into project source folder.
Validates downloaded container with FFprobe.
"""
import sys
import os
import json
import subprocess
import re
import urllib.request
import shutil

def sanitize_filename(name):
    return re.sub(r'[^a-zA-Z0-9_\-\.]', '_', name)

def get_cookie_file():
    candidates = [
        os.path.join(os.getcwd(), 'cookies.txt'),
        os.path.join(os.getcwd(), 'projects', 'cookies.txt'),
        os.environ.get('YOUTUBE_COOKIES_PATH', '')
    ]
    for c in candidates:
        if c and os.path.isfile(c) and os.path.getsize(c) > 0:
            return c
    return None

def download_direct_url(url, output_dir):
    """
    Downloads direct video files (e.g. mp4, webm, mov, mkv) directly using urllib.
    """
    try:
        # Determine filename from URL or default
        parsed_name = url.split('?')[0].split('/')[-1]
        if not parsed_name or '.' not in parsed_name:
            parsed_name = "direct_video.mp4"
        else:
            parsed_name = sanitize_filename(parsed_name)
            
        target_file = os.path.join(output_dir, f"source_{parsed_name}")
        
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=30) as response, open(target_file, 'wb') as out_f:
            shutil.copyfileobj(response, out_f)
            
        if os.path.exists(target_file) and os.path.getsize(target_file) > 1024:
            # Probe duration with ffprobe if available
            duration = 0
            try:
                probe = subprocess.run([
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", target_file
                ], stdout=subprocess.PIPE, text=True, check=True)
                duration = float(probe.stdout.strip())
            except Exception:
                pass
                
            return {
                "success": True,
                "file_path": target_file,
                "filename": os.path.basename(target_file),
                "title": parsed_name,
                "uploader": "Direct Web Stream",
                "duration": duration,
                "description": f"Direct media stream downloaded from {url[:80]}"
            }
    except Exception as e:
        return {"error": f"Direct stream download failed: {str(e)}"}
    return None

def download_video(url, output_dir, max_height=1080):
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Check if URL is a direct video link
    clean_url = url.split('?')[0].lower()
    if clean_url.endswith(('.mp4', '.webm', '.mov', '.mkv', '.m4v', '.avi')):
        direct_res = download_direct_url(url, output_dir)
        if direct_res and direct_res.get("success"):
            return direct_res

    # 2. Check if yt-dlp is available
    yt_dlp_bin = "/usr/local/bin/yt-dlp"
    if not os.path.exists(yt_dlp_bin):
        yt_dlp_bin = "yt-dlp"

    out_template = os.path.join(output_dir, "source_%(id)s.%(ext)s")
    
    cmd = [
        yt_dlp_bin,
        "--no-playlist",
        "-f", f"bestvideo[height<={max_height}][ext=mp4]+bestaudio[ext=m4a]/best[height<={max_height}][ext=mp4]/best",
        "--merge-output-format", "mp4",
        "-o", out_template,
        "--write-info-json",
        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ]

    # Find Node.js for JS challenges if available
    node_bin = shutil.which("node") or "/usr/local/bin/node"
    if os.path.exists(node_bin):
        cmd.extend(["--js-runtimes", f"node:{node_bin}"])

    # Include cookies if present
    cookie_file = get_cookie_file()
    if cookie_file:
        cmd.extend(["--cookies", cookie_file])
    else:
        # Try resilient player clients when no cookies are provided
        cmd.extend(["--extractor-args", "youtube:player_client=android,ios,mweb,web"])

    cmd.append(url)

    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        
        # Locate the downloaded mp4 file
        files = [f for f in os.listdir(output_dir) if f.startswith("source_") and f.endswith(".mp4")]
        if not files:
            files = [f for f in os.listdir(output_dir) if f.startswith("source_") and not f.endswith(".json")]
            
        if not files:
            return {"error": "yt-dlp finished but no output file was found."}

        target_file = os.path.join(output_dir, files[0])
        info_json_file = os.path.splitext(target_file)[0] + ".info.json"
        
        metadata = {}
        if os.path.exists(info_json_file):
            try:
                with open(info_json_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
            except Exception:
                pass

        return {
            "success": True,
            "file_path": target_file,
            "filename": os.path.basename(target_file),
            "title": metadata.get("title", "Video"),
            "uploader": metadata.get("uploader"),
            "duration": metadata.get("duration"),
            "description": metadata.get("description", "")[:500]
        }
    except subprocess.CalledProcessError as e:
        err_msg = (e.stderr or e.stdout or "").strip()
        
        # Check specifically for YouTube HTTP 429 / bot challenge
        if "HTTP Error 429" in err_msg or "confirm you’re not a bot" in err_msg or "confirm you're not a bot" in err_msg:
            return {
                "error": "YouTube blocked automated download from this cloud server IP (HTTP 429: Bot verification required). YouTube blocks cloud data centers from downloading videos without authentication. Please upload your video file directly using the 'Upload File' tab (MP4/MOV/WebM) or provide a direct video URL.",
                "code": "YOUTUBE_BOT_BLOCK",
                "details": err_msg
            }
            
        return {"error": f"Download failed: {err_msg}"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: downloader.py <url> <output_dir>"}))
        sys.exit(1)
    res = download_video(sys.argv[1], sys.argv[2])
    print(json.dumps(res, indent=2))
