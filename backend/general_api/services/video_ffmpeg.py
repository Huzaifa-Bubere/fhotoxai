"""
FFmpeg/ffprobe helpers for video metadata probing and frame extraction.

Security notes:
- FFmpeg is invoked with an argument array (no shell), so filenames can
  never inject shell commands.
- All output paths are generated server-side from UUIDs; user input is
  never concatenated into a path.
- Every subprocess gets a hard timeout; runaway processes are terminated.

Timestamp accuracy:
- A single decoding pass extracts all frames: ``-ss <start>`` (input
  option = accurate seek) feeds a ``fps=1/<interval>`` filter, which
  samples the *decoded presentation* timeline at uniform intervals and
  therefore also handles variable-frame-rate inputs correctly.
- Each frame's true source timestamp comes from the ``showinfo`` filter
  log (``pts_time``) added to ``start``. We never assume
  ``frame_index / nominal_fps`` is correct: if fewer ``showinfo`` lines
  arrive than frames written, we fall back to the provably uniform
  fps-filter grid ``start + i*interval`` and record that in metadata.
"""

import json
import logging
import math
import os
import re
import shutil
import signal
import subprocess
import time
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger("video_ffmpeg")

_SHOWINFO_PTS_RE = re.compile(r"pts_time:([0-9]+(?:\.[0-9]+)?)")


class FFmpegNotFoundError(RuntimeError):
    pass


class VideoValidationError(RuntimeError):
    """Raised when the input is not a decodable video we can process."""

    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.detail = detail or {}


class RawRunResult:
    def __init__(self, returncode: int, stdout: bytes, stderr: bytes):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


def resolve_bin(name: str, explicit: str = "") -> str:
    """Find an executable: explicit argument, then FFMPEG_BIN/FFPROBE_BIN
    env override, then PATH lookup."""
    if explicit and os.path.isfile(explicit):
        return explicit
    env_value = os.environ.get(f"{name.upper()}_BIN")  # FFMPEG_BIN / FFPROBE_BIN
    if env_value and os.path.isfile(env_value):
        return env_value
    found = shutil.which(name)
    if found:
        return found
    raise FFmpegNotFoundError(
        f"'{name}' binary not found. Install FFmpeg on PATH or set "
        f"{name.upper()}_BIN (see docs/VIDEO_TO_PHOTO.md)."
    )


def _terminate_process_tree(proc: subprocess.Popen) -> None:
    """Terminate (then kill) a runaway ffmpeg/ffprobe process."""
    try:
        if hasattr(os, "killpg"):
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        else:
            proc.terminate()
    except Exception:  # noqa: BLE001 - best effort
        try:
            proc.terminate()
        except Exception:  # noqa: BLE001
            pass
    try:
        if proc.poll() is None:
            if hasattr(os, "killpg"):
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            else:
                proc.kill()
    except Exception:  # noqa: BLE001
        pass


# ---------------------------------------------------------------------------
# Probing
# ---------------------------------------------------------------------------


def probe_video(
    path: str,
    ffprobe_bin: str = "",
    timeout: int = 60,
) -> Dict[str, Any]:
    """
    Probe a media file with ffprobe and return normalized metadata:
        container, codec_name, duration_sec, width, height, fps,
        rotation_deg, size_bytes
    Raises VideoValidationError for non-media / corrupt / unsupported input.
    """
    bin_path = resolve_bin("ffprobe", ffprobe_bin)
    cmd = [
        bin_path,
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        path,
    ]
    try:
        proc_run = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.DEVNULL,
            shell=False,
            timeout=timeout,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except subprocess.TimeoutExpired as exc:
        raise VideoValidationError(
            f"ffprobe exceeded its {timeout}s execution timeout.",
            {"kind": "timeout"},
        ) from exc
    except FileNotFoundError as exc:
        raise FFmpegNotFoundError(f"ffprobe binary missing: {exc}") from exc
    result = RawRunResult(proc_run.returncode, proc_run.stdout, proc_run.stderr)

    if result.returncode != 0:
        stderr = (result.stderr or b"").decode("utf-8", "replace").strip()
        raise VideoValidationError(
            "File is not a supported video (corrupt, unknown or unreadable container).",
            {"kind": "bad_container", "stderr": stderr[:500]},
        )

    try:
        data = json.loads(result.stdout.decode("utf-8", "replace"))
    except json.JSONDecodeError as exc:
        raise VideoValidationError("ffprobe returned unparseable metadata.") from exc

    return _parse_probe_payload(data)


def parse_probe_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """Public wrapper used by tests: parse an ffprobe -print_format json dict."""
    return _parse_probe_payload(data)


def _parse_probe_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    streams = data.get("streams") or []
    fmt = data.get("format") or {}
    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    if video_stream is None:
        raise VideoValidationError(
            "No video stream found (audio-only file or still image).",
            {"kind": "no_video_stream"},
        )

    codec_name = video_stream.get("codec_name") or "unknown"

    # Duration: prefer stream, then container, else nb_frames/avg_fps for
    # constant-rate streams lacking duration. Never trust a single path.
    duration = None
    for candidate in (video_stream.get("duration"), fmt.get("duration")):
        try:
            if candidate is not None and float(candidate) > 0:
                duration = float(candidate)
                break
        except (TypeError, ValueError):
            continue
    fps = _parse_frame_rate(video_stream.get("avg_frame_rate"))
    if duration is None and fps and video_stream.get("nb_frames"):
        try:
            duration = int(video_stream["nb_frames"]) / fps
        except (TypeError, ValueError, ZeroDivisionError):
            duration = None
    if duration is None:
        raise VideoValidationError(
            "Video duration could not be determined (live stream or corrupt index).",
            {"kind": "no_duration"},
        )

    rotation = _stream_rotation(video_stream)
    width = int(video_stream.get("width") or 0)
    height = int(video_stream.get("height") or 0)
    # Swap so width/height describe the *displayed* frame under player-side
    # rotation of 90/270 degrees.
    if rotation in (90, 270) and width and height:
        width, height = height, width

    return {
        "container": (fmt.get("format_name") or "").split(",")[0],
        "codec_name": codec_name,
        "duration_sec": float(duration),
        "width": width,
        "height": height,
        "fps": fps,
        "rotation_deg": rotation,
        "is_video": True,
        "size_bytes": int(fmt.get("size") or 0),
    }


def _parse_frame_rate(value: Any) -> Optional[float]:
    """Parse ffprobe's 'num/den' frame-rate syntax ('30000/1001', '0/0')."""
    if not value:
        return None
    try:
        value = str(value)
        if "/" in value:
            num, den = value.split("/", 1)
            num_f, den_f = float(num), float(den)
            if den_f <= 0:
                return None
            fps = num_f / den_f
            return fps if fps > 0 else None
        fps = float(value)
        return fps if fps > 0 else None
    except (TypeError, ValueError):
        return None


def _stream_rotation(stream: Dict[str, Any]) -> int:
    """Rotation can live in tags or a display-matrix side data (ffmpeg>=4.4)."""
    tags = stream.get("tags") or {}
    for key in ("rotate", "ROTATE", "displaymatrix"):
        try:
            if key in tags and tags[key] not in {None, ""}:
                return int(float(tags[key])) % 360
        except (TypeError, ValueError):
            continue
    for side in stream.get("side_data_list") or []:
        rot = side.get("rotation")
        if rot is not None:
            try:
                return int(float(rot)) % 360
            except (TypeError, ValueError):
                continue
    return 0


# ---------------------------------------------------------------------------
# Frame extraction
# ---------------------------------------------------------------------------


def estimate_frame_count(duration_sec: float, interval_sec: float, max_frames: int) -> int:
    """Expected candidate grid for the settings (before any filtering)."""
    if duration_sec <= 0 or interval_sec <= 0:
        return 0
    return min(max_frames, int(math.ceil(duration_sec / interval_sec)))


def extract_frames_interval(
    path: str,
    output_pattern: str,
    interval_sec: float,
    start_sec: float = 0.0,
    end_sec: Optional[float] = None,
    max_frames: int = 300,
    jpeg_quality: int = 2,
    timeout: int = 600,
    get_cancelled: Optional[Callable[[], bool]] = None,
) -> Tuple[List[Dict[str, Any]], str]:
    """
    Run the one-pass interval extraction.

    Returns (frames, stderr_tail) where frames is a list of dicts:
        {frame_index, timestamp_sec, timestamp_source: 'pts'|'fps_grid',
         filename}
    Raises VideoValidationError when extraction yields no decodable frames.
    """
    bin_path = resolve_bin("ffmpeg")
    cmd = [
        bin_path,
        "-hide_banner",
        "-loglevel", "info",   # showinfo logs at info level
        "-nostdin",
        "-nostats",
        "-y",
        "-ss", f"{max(0.0, start_sec):.6f}",
        "-i", path,
        "-map", "0:v:0",
    ]
    if end_sec is not None:
        span = max(0.05, end_sec - max(0.0, start_sec))
        cmd += ["-t", f"{span:.6f}"]
    cmd += [
        "-vf", f"fps=1/{interval_sec:.6f},showinfo",
        "-frames:v", str(max_frames),
        "-q:v", str(int(jpeg_quality)),
        output_pattern,
    ]

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        stdin=subprocess.DEVNULL,
        shell=False,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )

    cancelled = False
    deadline = time.monotonic() + timeout
    try:
        while True:
            if get_cancelled is not None and get_cancelled():
                cancelled = True
                _terminate_process_tree(proc)
                return [], "cancelled"
            try:
                _stdout, stderr = proc.communicate(timeout=0.5)
                break
            except subprocess.TimeoutExpired:
                if time.monotonic() > deadline:
                    _terminate_process_tree(proc)
                    try:
                        proc.communicate(timeout=5)
                    except Exception:  # noqa: BLE001
                        pass
                    raise VideoValidationError(
                        f"ffmpeg exceeded its {timeout}s execution timeout.",
                        {"kind": "timeout"},
                    )
    except VideoValidationError:
        raise
    except Exception as exc:  # unexpected
        _terminate_process_tree(proc)
        raise VideoValidationError(f"ffmpeg failed to run: {exc}") from exc

    stderr_text = (stderr or b"").decode("utf-8", "replace")
    stderr_tail = stderr_text[-800:]

    if cancelled:
        return [], "cancelled"

    produced: List[str] = []
    base_dir = os.path.dirname(output_pattern)
    if os.path.isdir(base_dir):
        for name in sorted(os.listdir(base_dir)):
            if name.endswith(".jpg") and not name.endswith(".log"):
                produced.append(name)
    produced.reverse()  # showinfo order corresponds to frame_000001..N

    # Parse showinfo pts_time lines (in augment order n=0..N-1).
    pts_times: List[float] = []
    for line in stderr_text.splitlines():
        if "showinfo" in line and "pts_time:" in line:
            m = _SHOWINFO_PTS_RE.search(line)
            if m:
                try:
                    pts_times.append(float(m.group(1)))
                except ValueError:
                    continue

    frames: List[Dict[str, Any]] = []
    if not produced and proc.returncode not in (0, None):
        # Zero output + nonzero exit can mean an unsupported/corrupt codec
        # OR simply a clip shorter than one interval (the fps filter then
        # emits nothing and ffmpeg reports the empty output). Retry with a
        # single-frame explicit seek before classifying the failure.
        fallback_path = os.path.join(base_dir, "frame_999999.jpg")
        if extract_single_frame(path, start_sec, fallback_path, jpeg_quality=jpeg_quality):
            produced = [os.path.basename(fallback_path)]
            pts_times = [0.0]
        else:
            decode_error_markers = (
                "invalid data", "error", "nonexistent", "corrupt",
                "could not find codec", "failed to open", "moov atom not found",
            )
            lowered = stderr_tail.lower()
            if any(marker in lowered for marker in decode_error_markers):
                raise VideoValidationError(
                    "Extraction produced no frames — the video appears to use "
                    "an unsupported codec or contain undecodable data.",
                    {"kind": "no_frames", "stderr": stderr_tail},
                )
            raise VideoValidationError(
                "No frames could be extracted from the selected time range.",
                {"kind": "no_frames"},
            )
    if not produced:
        # Success exit but empty output: same fallback for very short clips.
        fallback_path = os.path.join(base_dir, "frame_999999.jpg")
        if extract_single_frame(path, start_sec, fallback_path, jpeg_quality=jpeg_quality):
            produced = [os.path.basename(fallback_path)]
            pts_times = [0.0]
        else:
            raise VideoValidationError(
                "No frames could be extracted from the selected time range.",
                {"kind": "no_frames"},
            )

    pts_used = "pts"
    if len(pts_times) >= len(produced):
        timestamps = [max(0.0, start_sec + p) for p in pts_times[:len(produced)]]
        timestamps.reverse()  # match the produced (descending) listing
        timestamps = sorted(timestamps)
    else:
        pts_used = "fps_grid"
        timestamps = [start_sec + i * interval_sec for i in range(len(produced))]
    for i, ts in enumerate(timestamps):
        frames.append({
            "frame_index": i,
            "timestamp_sec": float(ts),
            "timestamp_source": pts_used,
            "filename": produced[i],
        })
    return frames, stderr_tail


def extract_single_frame(
    path: str,
    timestamp_sec: float,
    output_path: str,
    jpeg_quality: int = 2,
    timeout: int = 120,
) -> bool:
    """Extract one frame (used for thumbnails / re-grabs)."""
    bin_path = resolve_bin("ffmpeg")
    cmd = [
        bin_path,
        "-hide_banner", "-loglevel", "error", "-y",
        "-ss", f"{max(0.0, timestamp_sec):.6f}",
        "-i", path,
        "-frames:v", "1",
        "-q:v", str(int(jpeg_quality)),
        output_path,
    ]
    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.DEVNULL,
            shell=False,
            timeout=timeout,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        logger.warning("Single-frame extract failed at %.3fs: %s", timestamp_sec, exc)
        return False
    return proc.returncode == 0 and os.path.exists(output_path)
