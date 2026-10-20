-- =====================================================================
-- Migration 001: Video-to-Photo Extraction with Face-Based Grouping
-- =====================================================================
-- Adds:
--   event_videos             : uploaded source videos per event
--   video_extraction_jobs    : background extraction jobs (persistence,
--                              settings, counters, actionable errors)
--   video_extracted_frames   : per-frame metadata + import provenance
--   photos.source_video_id / photos.source_timestamp_ms : provenance links
--
-- The migration is additive and idempotent: it can be re-run safely and
-- never deletes or rewrites existing rows. It does NOT touch clustering
-- tables such as people_clusters, faces or attendees, so existing
-- groupings stay intact. Clustering is only re-run when an organizer
-- explicitly starts the existing workflow.
-- =====================================================================

-- Keep import provenance intact even if a video record is removed later.
ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS source_video_id INTEGER REFERENCES event_videos(id) ON DELETE SET NULL;
ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS source_timestamp_ms BIGINT;

-- ============================================================
-- EVENT VIDEOS (uploaded source assets)
-- ============================================================

CREATE TABLE IF NOT EXISTS event_videos (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    original_filename VARCHAR(500),
    stored_filename VARCHAR(500),
    mime_type VARCHAR(100) DEFAULT 'video/mp4',
    size_bytes BIGINT DEFAULT 0,
    storage_type VARCHAR(20) DEFAULT 'local',
    file_path TEXT,
    -- Probed media metadata (nullable until ffprobe completes)
    container VARCHAR(50),
    codec_name VARCHAR(100),
    duration_sec DOUBLE PRECISION,
    width INTEGER,
    height INTEGER,
    fps DOUBLE PRECISION,
    rotation_deg INTEGER DEFAULT 0,
    probe_failed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_videos_event_id ON event_videos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_videos_user_id ON event_videos(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_videos_stored_filename
    ON event_videos(stored_filename);

-- ============================================================
-- EXTRACTION JOBS (background worker persistence)
-- ============================================================

-- status: queued | processing | completed | failed | cancelled
-- stage : probe | extract | analyze | ready | (NULL when queued)
CREATE TABLE IF NOT EXISTS video_extraction_jobs (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES event_videos(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    extraction_type VARCHAR(20) NOT NULL DEFAULT 'interval',
    status VARCHAR(30) NOT NULL DEFAULT 'queued',
    stage VARCHAR(30),
    progress SMALLINT NOT NULL DEFAULT 0,
    -- User-provided extraction settings (JSON object)
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Counters reported to the UI
    candidate_frames INTEGER NOT NULL DEFAULT 0,
    rejected_blur INTEGER NOT NULL DEFAULT 0,
    rejected_duplicates INTEGER NOT NULL DEFAULT 0,
    rejected_faces INTEGER NOT NULL DEFAULT 0,
    preview_frames INTEGER NOT NULL DEFAULT 0,
    imported_photos INTEGER NOT NULL DEFAULT 0,
    expected_frames INTEGER NOT NULL DEFAULT 0,
    -- Actionable error text for failed jobs
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    retries INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_event_id ON video_extraction_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_video_id ON video_extraction_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_extraction_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_user_id ON video_extraction_jobs(user_id);

-- ============================================================
-- EXTRACTED FRAMES (candidates, previews, provenance)
-- ============================================================

-- frame_status: candidate | preview | imported
--               | rejected_blur | rejected_duplicate | rejected_faces
CREATE TABLE IF NOT EXISTS video_extracted_frames (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES video_extraction_jobs(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES event_videos(id) ON DELETE SET NULL,
    frame_index INTEGER NOT NULL,
    timestamp_ms BIGINT NOT NULL,
    preview_path TEXT NOT NULL,
    storage_type VARCHAR(20) DEFAULT 'local',
    width INTEGER,
    height INTEGER,
    file_size BIGINT DEFAULT 0,
    blur_score DOUBLE PRECISION,
    quality_score DOUBLE PRECISION,
    phash TEXT,
    has_faces BOOLEAN DEFAULT FALSE,
    face_count INTEGER DEFAULT 0,
    frame_status VARCHAR(30) NOT NULL DEFAULT 'candidate',
    reject_reason VARCHAR(50),
    imported_photo_id INTEGER REFERENCES photos(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_video_frames_job_id ON video_extracted_frames(job_id);
CREATE INDEX IF NOT EXISTS idx_video_frames_status ON video_extracted_frames(frame_status);
CREATE INDEX IF NOT EXISTS idx_video_frames_imported_photo_id
    ON video_extracted_frames(imported_photo_id);

-- Prevent duplicate frame rows (same nominal sample time) inside one job.
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_frames_job_timestamp
    ON video_extracted_frames(job_id, timestamp_ms);
