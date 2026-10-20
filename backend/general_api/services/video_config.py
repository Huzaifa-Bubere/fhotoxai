"""
Configuration for the Video-to-Photo extraction feature.

All limits are server-side (and surfaced to the UI through
``GET /videos/limits`` or the job endpoints). They are application policy
limits — not claims about what FFmpeg technically supports.

Every value can be tuned with environment variables so deployments with
more or fewer resources can adjust without code changes.
"""

import os
from dataclasses import dataclass, field
from typing import Dict, List


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, "").strip() or default)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, "").strip() or default)
    except ValueError:
        return default


def _env_float_list(name: str, default_values) -> list:
    """Comma-separated float list; junk items are skipped, never fatal."""
    raw = os.environ.get(name, "").strip()
    if not raw:
        return list(default_values)
    values = []
    for item in raw.split(","):
        try:
            values.append(float(item.strip()))
        except ValueError:
            continue
    if not values:
        return list(default_values)
    return values


@dataclass
class VideoSettings:
    """Snapshot of the video feature configuration (reads env on build)."""

    # --- Upload limits -------------------------------------------------
    max_upload_mb: int = field(default_factory=lambda: _env_int("VIDEO_MAX_UPLOAD_MB", 250))
    max_duration_sec: int = field(default_factory=lambda: _env_int("VIDEO_MAX_DURATION_SEC", 300))
    max_frame_side_px: int = field(default_factory=lambda: _env_int("VIDEO_MAX_FRAME_SIDE_PX", 2160))

    # Interval choices offered to the user (seconds between frames).
    allowed_intervals: List[float] = field(
        default_factory=lambda: _env_float_list("VIDEO_ALLOWED_INTERVALS", [0.25, 0.5, 1, 2, 5])
    )
    default_interval: float = field(default_factory=lambda: _env_float("VIDEO_DEFAULT_INTERVAL_SEC", 1.0))

    # --- Extraction limits ---------------------------------------------
    max_candidate_frames: int = field(default_factory=lambda: _env_int("VIDEO_MAX_CANDIDATE_FRAMES", 300))
    frame_jpeg_quality: int = field(default_factory=lambda: _env_int("VIDEO_FRAME_JPEG_QUALITY", 2))
    ffmpeg_timeout_sec: int = field(default_factory=lambda: _env_int("VIDEO_FFMPEG_TIMEOUT_SEC", 900))
    max_concurrent_jobs: int = field(default_factory=lambda: _env_int("VIDEO_MAX_CONCURRENT_JOBS", 1))

    # --- Quality / duplicate filters (heuristic thresholds) --------------
    blur_laplacian_min: float = field(default_factory=lambda: _env_float("VIDEO_BLUR_LAPLACIAN_MIN", 30.0))
    duplicate_hamming_max: int = field(default_factory=lambda: _env_int("VIDEO_DUP_HAMMING_MAX", 6))
    # Only compare against the last N accepted frames (bounded comparisons).
    duplicate_window: int = field(default_factory=lambda: _env_int("VIDEO_DUP_WINDOW", 40))

    # --- Behaviour ------------------------------------------------------
    # Background worker is enabled by default; set VIDEO_WORKER_ENABLED=0 to
    # disable (e.g., running the API purely as a read-only replica).
    worker_enabled: bool = field(
        default_factory=lambda: os.environ.get("VIDEO_WORKER_ENABLED", "1").strip().lower()
        not in {"0", "false", "no"}
    )
    # 'local' writes frames under DOWNLOADS_DIR/video_jobs (works without AWS).
    # 's3' additionally uploads previews to S3 when credentials exist.
    frame_storage_mode: str = field(
        default_factory=lambda: os.environ.get("VIDEO_FRAME_STORAGE_MODE", "local").strip().lower()
    )

    # --- Binary discovery ------------------------------------------------
    # Explicit env overrides win; otherwise PATH lookup (Docker installs both).
    ffmpeg_bin: str = field(default_factory=lambda: os.environ.get("FFMPEG_BIN", ""))
    ffprobe_bin: str = field(default_factory=lambda: os.environ.get("FFPROBE_BIN", ""))

    # --- Import limits ---------------------------------------------------
    max_import_per_request: int = field(
        default_factory=lambda: _env_int("VIDEO_MAX_IMPORT_PER_REQUEST", 300)
    )

    def allowed_interval_values(self) -> List[float]:
        return sorted({float(v) for v in self.allowed_intervals if v > 0})

    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    def to_public_dict(self) -> Dict:
        """Client-safe configuration (paths stripped)."""
        return {
            "max_upload_mb": self.max_upload_mb,
            "max_upload_bytes": self.max_upload_bytes(),
            "max_duration_sec": self.max_duration_sec,
            "max_frame_side_px": self.max_frame_side_px,
            "allowed_intervals": self.allowed_interval_values(),
            "default_interval": self.default_interval,
            "max_candidate_frames": self.max_candidate_frames,
            "max_import_per_request": self.max_import_per_request,
            "blur_laplacian_min": self.blur_laplacian_min,
            "duplicate_hamming_max": self.duplicate_hamming_max,
        }


def load_video_settings() -> VideoSettings:
    return VideoSettings()
