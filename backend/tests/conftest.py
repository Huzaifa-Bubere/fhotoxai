"""
Test configuration for backend tests.

Pure-logic tests run anywhere; FFmpeg-dependent tests are skipped (with a
clear message) when the binaries are missing, and DB-backed tests only run
when VIDEO_DB_TESTS=1 and the database is reachable.
"""

import os
import shutil
import subprocess
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import pytest  # noqa: E402


def _find_bin(name):
    explicit = os.environ.get(f"{name.upper()}_BIN")
    if explicit and os.path.isfile(explicit):
        return explicit
    return shutil.which(name)

FFMPEG_BIN = _find_bin("ffmpeg")
FFPROBE_BIN = _find_bin("ffprobe")
HAS_FFMPEG = FFMPEG_BIN is not None
HAS_FFPROBE = FFPROBE_BIN is not None
HAS_MEDIA_TOOLS = HAS_FFMPEG and HAS_FFPROBE

if not HAS_MEDIA_TOOLS:
    print(
        "\nNOTE: ffmpeg/ffprobe not found — media tests will be SKIPPED.\n"
        "Install FFmpeg (or set FFMPEG_BIN/FFPROBE_BIN) to run them.\n"
    )


def run_cmd(args, **kwargs):
    return subprocess.run(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        stdin=subprocess.DEVNULL,
        shell=False,
        check=False,
        **kwargs,
    )


# ---------------------------------------------------------------------------
# Deterministic video fixtures
# ---------------------------------------------------------------------------


def make_test_video(
    out_path,
    duration=2,
    width=128,
    height=96,
    fps=25,
    pattern="moving_color",
    codec="libx264",
    extra_args=None,
):
    """
    Generate a tiny deterministic test video via FFmpeg's lavfi sources.

    pattern:
      'moving_color'  - color box sweeping across (frame contents vary)
      'static'        - identical frames (duplicate-filter fodder)
      'blurry'        - gaussian-blurred motion (low Laplacian variance)
      'noise'         - alternating noise (high detail)
    """
    assert HAS_FFMPEG, "ffmpeg required to build fixtures"
    patterns = {
        "moving_color": "testsrc2=size={w}x{h}:rate={fps}:duration={d}",
        "static": "color=c=gray@0.5:s={w}x{h}:r={fps}:d={d}",
        "blurry": "testsrc2=size={w}x{h}:rate={fps}:duration={d},boxblur=20:2",
        "noise": "mandelbrot=size={w}x{h}:rate={fps}",
    }
    source = patterns[pattern].format(w=width, h=height, fps=fps, d=duration)
    args = [
        FFMPEG_BIN, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "lavfi", "-i", source,
        "-c:v", codec,
        "-pix_fmt", "yuv420p",
        out_path,
    ]
    if pattern == "static":
        args += ["-t", str(duration)]
    if extra_args:
        args += extra_args
    result = run_cmd(args)
    assert result.returncode == 0, result.stderr.decode("utf-8", "replace")
    return out_path


def make_corrupt_video(out_path):
    """A file that is not a decodable video at all."""
    with open(out_path, "wb") as handle:
        handle.write(b"this is not a video file" * 64)
    return out_path


@pytest.fixture(scope="session")
def tmp_media_dir(tmp_path_factory):
    return tmp_path_factory.mktemp("media")


@pytest.fixture(scope="session")
def sample_video(tmp_media_dir):
    return make_test_video(str(tmp_media_dir / "sample.mp4"), duration=2)


@pytest.fixture(scope="session")
def static_video(tmp_media_dir):
    return make_test_video(str(tmp_media_dir / "static.mp4"), duration=2, pattern="static")


@pytest.fixture(scope="session")
def blurry_video(tmp_media_dir):
    return make_test_video(str(tmp_media_dir / "blurry.mp4"), duration=2, pattern="blurry")


@pytest.fixture(scope="session")
def portrait_video(tmp_media_dir):
    return make_test_video(str(tmp_media_dir / "portrait.mp4"), duration=1.2, width=96, height=160)


@pytest.fixture(scope="session")
def corrupt_file(tmp_media_dir):
    return make_corrupt_video(str(tmp_media_dir / "corrupt.mp4"))
