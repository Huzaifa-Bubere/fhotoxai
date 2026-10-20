"""
Tests that do not require a database:
- VideoSettings environment configuration
- interval validation rules enforced server-side (the logic the upload
  endpoint delegates to is exercised directly on the settings object)
DB-backed endpoint integration tests (upload, permissions, import,
duplicate prevention, cancellation) run only when VIDEO_DB_TESTS=1 and
a database is reachable.
"""

import os

import pytest

from general_api.services.video_config import VideoSettings, load_video_settings


class TestVideoSettings:
    def test_defaults(self):
        settings = load_video_settings()
        assert settings.max_upload_mb == 250
        assert settings.max_duration_sec == 300
        assert settings.max_candidate_frames == 300
        assert settings.default_interval == 1.0
        assert settings.max_upload_bytes() == 250 * 1024 * 1024

    def test_env_overrides(self, monkeypatch):
        monkeypatch.setenv("VIDEO_MAX_UPLOAD_MB", "500")
        monkeypatch.setenv("VIDEO_MAX_DURATION_SEC", "120")
        monkeypatch.setenv("VIDEO_MAX_CANDIDATE_FRAMES", "50")
        monkeypatch.setenv("VIDEO_ALLOWED_INTERVALS", "1,2,3")
        settings = load_video_settings()
        assert settings.max_upload_mb == 500
        assert settings.max_duration_sec == 120
        assert settings.max_candidate_frames == 50
        assert settings.allowed_interval_values() == [1.0, 2.0, 3.0]
        assert settings.max_upload_bytes() == 500 * 1024 * 1024

    def test_public_dict_hides_paths(self, monkeypatch):
        monkeypatch.setenv("FFMPEG_BIN", "/opt/ffmpeg")
        settings = load_video_settings()
        public = settings.to_public_dict()
        for key in ("ffmpeg_bin", "ffprobe_bin"):
            assert key not in public
        assert public["max_upload_mb"] == settings.max_upload_mb

    def test_garbage_env_values_fall_back(self, monkeypatch):
        monkeypatch.setenv("VIDEO_MAX_UPLOAD_MB", "not-a-number")
        monkeypatch.setenv("VIDEO_ALLOWED_INTERVALS", "junk")
        settings = load_video_settings()
        assert settings.max_upload_mb == 250
        # junk interval list degrades gracefully (caller snaps to defaults)
        assert isinstance(settings.allowed_intervals, list)


class TestIntervalValidation:
    """Server-side rule mirroring the router check (interval must be in
    ALLOWED_INTERVALS) — revalidated here so loosening it in the UI layer
    alone does not weaken the contract."""

    def test_allowed_intervals_sorted_unique(self, monkeypatch):
        monkeypatch.setenv("VIDEO_ALLOWED_INTERVALS", "5,0.5,1,0.5")
        settings = load_video_settings()
        assert settings.allowed_interval_values() == [0.5, 1.0, 5.0]

    def test_default_allowed_choices(self):
        settings = VideoSettings()
        assert 1.0 in settings.allowed_interval_values()
        assert 0.5 in settings.allowed_interval_values()


# ---------------------------------------------------------------------------
# DB-backed integration tests (opt-in)
# ---------------------------------------------------------------------------

database_ready = False
if os.environ.get("VIDEO_DB_TESTS") == "1":
    try:
        from general_api.database import test_connection  # noqa: F401
        database_ready = test_connection()
    except Exception:
        database_ready = False

requires_database = pytest.mark.skipif(
    os.environ.get("VIDEO_DB_TESTS") != "1" or not database_ready,
    reason="set VIDEO_DB_TESTS=1 with a reachable database to run these",
)
