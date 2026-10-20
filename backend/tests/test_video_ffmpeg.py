"""
Tests for video_ffmpeg helpers: probing, limits, timestamp-accurate
interval extraction. Media tests skip when ffmpeg/ffprobe are absent.
"""

import os
import shutil

import pytest

from general_api.services import video_ffmpeg
from general_api.services.video_ffmpeg import (
    VideoValidationError,
    estimate_frame_count,
    parse_probe_payload,
)
from general_api.services.video_worker import VideoWorker


def _media_available():
    # honor explicit binary overrides too (matches conftest's FFMPEG_BIN)
    ffmpeg = os.environ.get("FFMPEG_BIN") or shutil.which("ffmpeg")
    ffprobe = os.environ.get("FFPROBE_BIN") or shutil.which("ffprobe")
    return bool(ffmpeg and ffprobe)


needs_media = pytest.mark.skipif(
    not _media_available(),
    reason="ffmpeg/ffprobe not installed in this environment",
)


# ---------------------------------------------------------------------------
# Probe parsing (pure, no binaries needed)
# ---------------------------------------------------------------------------

def test_parse_probe_payload_basic():
    payload = {
        "streams": [
            {"codec_type": "video", "codec_name": "h264", "width": 1920, "height": 1080,
             "avg_frame_rate": "30000/1001", "duration": "10.5", "nb_frames": "315"},
        ],
        "format": {"format_name": "mov,mp4,m4a,3gp,3g2,mj2", "duration": "10.5", "size": "1048576"},
    }
    meta = parse_probe_payload(payload)
    assert meta["codec_name"] == "h264"
    assert meta["duration_sec"] == pytest.approx(10.5)
    assert meta["width"] == 1920
    assert meta["fps"] == pytest.approx(29.97, abs=0.01)
    assert meta["rotation_deg"] == 0


def test_parse_probe_payload_no_video_stream():
    payload = {"streams": [{"codec_type": "audio", "codec_name": "aac"}],
               "format": {"duration": "5"}}
    with pytest.raises(VideoValidationError):
        parse_probe_payload(payload)


def test_parse_probe_payload_rotation_90_swaps_dimensions():
    payload = {
        "streams": [
            {"codec_type": "video", "codec_name": "h264", "width": 1920, "height": 1080,
             "avg_frame_rate": "30/1", "duration": "6", "tags": {"rotate": "90"}},
        ],
        "format": {"duration": "6"},
    }
    meta = parse_probe_payload(payload)
    # Rotated 90°: the *displayed* frame is portrait.
    assert meta["rotation_deg"] == 90
    assert (meta["width"], meta["height"]) == (1080, 1920)


def test_parse_probe_payload_rotation_side_data():
    payload = {
        "streams": [
            {"codec_type": "video", "codec_name": "hevc", "width": 1280, "height": 720,
             "avg_frame_rate": "25/1", "duration": "4",
             "side_data_list": [{"rotation": -270}]},
        ],
        "format": {"duration": "4"},
    }
    meta = parse_probe_payload(payload)
    assert meta["rotation_deg"] == 90  # -270 % 360 == 90
    assert (meta["width"], meta["height"]) == (720, 1280)


def test_parse_probe_payload_no_duration():
    payload = {
        "streams": [{"codec_type": "video", "codec_name": "h264", "width": 640, "height": 360}],
        "format": {},
    }
    with pytest.raises(VideoValidationError) as exc_info:
        parse_probe_payload(payload)
    assert "duration" in str(exc_info.value).lower()


# ---------------------------------------------------------------------------
# Limit policy (pure)
# ---------------------------------------------------------------------------

class FakeSettings:
    max_duration_sec = 300
    max_frame_side_px = 2160


def test_limit_violations_accepts_normal():
    meta = {"duration_sec": 5, "width": 128, "height": 96}
    assert VideoWorker._limit_violations(meta, FakeSettings()) == []


def test_limit_violations_flags_duration():
    meta = {"duration_sec": 301.2, "width": 100, "height": 100}
    problems = VideoWorker._limit_violations(meta, FakeSettings())
    assert any("duration" in p for p in problems)


def test_limit_violations_flags_resolution():
    meta = {"duration_sec": 5, "width": 3840, "height": 2160}
    problems = VideoWorker._limit_violations(meta, FakeSettings())
    assert any("Resolution" in p for p in problems)


def test_estimate_frame_count():
    assert estimate_frame_count(0, 1, 300) == 0
    assert estimate_frame_count(2.0, 1.0, 300) == 2
    assert estimate_frame_count(2.1, 1.0, 300) == 3
    assert estimate_frame_count(600, 1, 300) == 300  # capped
    # video shorter than the interval still yields exactly one frame
    assert estimate_frame_count(0.4, 1, 300) == 1


# ---------------------------------------------------------------------------
# Real media (requires ffmpeg + ffprobe)
# ---------------------------------------------------------------------------

def _run_if_available():
    return _media_available()


@pytest.mark.skipif(not _run_if_available(), reason="ffmpeg/ffprobe not installed")
class TestRealMedia:
    def test_probe_sample_video(self, sample_video, tmp_path):
        meta = video_ffmpeg.probe_video(str(sample_video))
        assert meta["is_video"] is True
        assert 1.0 <= meta["duration_sec"] <= 3.0
        assert meta["width"] == 128 and meta["height"] == 96
        assert meta["codec_name"] == "h264"

    def test_portrait_video_reports_displayed_dimensions(self, portrait_video, tmp_path):
        meta = video_ffmpeg.probe_video(str(portrait_video))
        # portrait: displayed height greater than width
        assert max(meta["width"], meta["height"]) == 160
        assert 0.5 <= meta["duration_sec"] <= 2.0

    def test_corrupt_file_rejected(self, corrupt_file):
        with pytest.raises(VideoValidationError):
            video_ffmpeg.probe_video(str(corrupt_file))

    def test_interval_extraction_timestamps(self, sample_video, tmp_path):
        out_pattern = str(tmp_path / "frame_%06d.jpg")
        frames, _stderr = video_ffmpeg.extract_frames_interval(
            str(sample_video), out_pattern, interval_sec=0.5, max_frames=20,
        )
        assert len(frames) >= 3, "expected several frames from a 2s clip"
        timestamps = [f["timestamp_sec"] for f in frames]
        # ordered ascending
        assert timestamps == sorted(timestamps)
        # interval grid: consecutive deltas close to 0.5s
        for a, b in zip(timestamps, timestamps[1:]):
            assert 0.4 <= (b - a) <= 0.6, timestamps
        # first frame should come from the beginning of the video
        assert timestamps[0] < 0.75
        assert all(f["filename"] for f in frames)
        for f in frames:
            assert os.path.exists(os.path.join(str(tmp_path), f["filename"]))

    def test_start_end_range_clips_output(self, sample_video, tmp_path):
        out_pattern = str(tmp_path / "frame_%06d.jpg")
        frames, _ = video_ffmpeg.extract_frames_interval(
            str(sample_video), out_pattern, interval_sec=0.5,
            start_sec=1.0, end_sec=1.6, max_frames=20,
        )
        timestamps = [f["timestamp_sec"] for f in frames]
        assert all(0.95 <= t <= 1.75 for t in timestamps)
        assert len(timestamps) >= 1

    def test_vfr_video_extraction(self, tmp_path):
        import conftest
        # Use a variable-frame-rate encode (avi container with fps variance)
        vfr_path = str(tmp_path / "vfr.mp4")
        base = str(tmp_path / "base.mp4")
        conftest.make_test_video(base, duration=2)
        args = [
            video_ffmpeg.resolve_bin("ffmpeg"), "-hide_banner", "-loglevel", "error", "-y",
            "-i", base,
            "-vf", "setpts=N/(30*TB)",  # re-time to nominal 30 fps w/ VFR pts
            "-r", "30",
            vfr_path,
        ]
        result = conftest.run_cmd(args)
        if result.returncode != 0:
            pytest.skip(f"could not build VFR fixture: {result.stderr[-200:]}")
        out_pattern = str(tmp_path / "frame_%06d.jpg")
        frames, _ = video_ffmpeg.extract_frames_interval(
            vfr_path, out_pattern, interval_sec=0.5, max_frames=20,
        )
        assert len(frames) >= 2
        ts = [f["timestamp_sec"] for f in frames]
        assert ts == sorted(ts)

    def test_video_shorter_than_interval(self, tmp_path):
        import conftest
        tiny = str(tmp_path / "tiny.mp4")
        conftest.make_test_video(tiny, duration=0.5)
        out_pattern = str(tmp_path / "frame_%06d.jpg")
        frames, _ = video_ffmpeg.extract_frames_interval(
            tiny, out_pattern, interval_sec=5.0, max_frames=10,
        )
        # one (or no) frame is acceptable; it must not hang or error
        assert len(frames) <= 1

    def test_short_range_returns_no_frames_error(self, sample_video, tmp_path):
        # The whole clip lies before the requested start → nothing extractable
        with pytest.raises(VideoValidationError):
            video_ffmpeg.extract_frames_interval(
                str(sample_video), str(tmp_path / "frame_%06d.jpg"),
                interval_sec=1, start_sec=95.0, end_sec=96.0, max_frames=5,
            )
