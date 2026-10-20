"""
Database persistence for the Video-to-Photo feature.

All SQL lives here (the router and worker stay thin). Multi-statement
writers (import, state transitions) use the shared transaction helper so
they are atomic; a unique (job_id, timestamp_ms) index on frames plus
status checks *inside* the import transaction make repeated import
requests idempotent (no duplicates, no double-charged counters).
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from general_api.database import (
    DatabaseTransaction,
    execute_insert,
    execute_query,
    execute_update,
    execute_update_safely,
)

logger = logging.getLogger("video_store")

JOB_STATUS_QUEUED = "queued"
JOB_STATUS_PROCESSING = "processing"
JOB_STATUS_COMPLETED = "completed"
JOB_STATUS_FAILED = "failed"
JOB_STATUS_CANCELLED = "cancelled"
ACTIVE_STATUSES = (JOB_STATUS_QUEUED, JOB_STATUS_PROCESSING)
TERMINAL_STATUSES = (JOB_STATUS_COMPLETED, JOB_STATUS_FAILED, JOB_STATUS_CANCELLED)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if isinstance(dt, datetime) else dt


# ---------------------------------------------------------------------------
# Videos
# ---------------------------------------------------------------------------


def create_event_video(
    event_id: int,
    user_id: int,
    original_filename: str,
    stored_filename: str,
    mime_type: str,
    size_bytes: int,
    storage_type: str,
    file_path: str,
) -> int:
    return execute_insert(
        """
        INSERT INTO event_videos
            (event_id, user_id, original_filename, stored_filename, mime_type,
             size_bytes, storage_type, file_path)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (event_id, user_id, original_filename, stored_filename, mime_type,
         size_bytes, storage_type, file_path),
    )


def update_video_probe(video_id: int, meta: Dict[str, Any], probe_failed: bool) -> None:
    execute_update(
        """
        UPDATE event_videos
        SET container = %s, codec_name = %s, duration_sec = %s, width = %s,
            height = %s, fps = %s, rotation_deg = %s, probe_failed = %s
        WHERE id = %s
        """,
        (
            meta.get("container"),
            meta.get("codec_name"),
            meta.get("duration_sec"),
            meta.get("width"),
            meta.get("height"),
            meta.get("fps"),
            int(meta.get("rotation_deg") or 0),
            probe_failed,
            video_id,
        ),
    )


def get_video(video_id: int) -> Optional[Dict[str, Any]]:
    rows = execute_query("SELECT * FROM event_videos WHERE id = %s", (video_id,))
    return rows[0] if rows else None


def delete_video_file_record(video_id: int) -> Optional[Dict[str, Any]]:
    rows = execute_query("SELECT * FROM event_videos WHERE id = %s", (video_id,))
    execute_update("DELETE FROM event_videos WHERE id = %s", (video_id,))
    return rows[0] if rows else None


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------


def create_extraction_job(
    event_id: int,
    video_id: int,
    user_id: int,
    settings: Dict[str, Any],
    expected_frames: int,
) -> int:
    return execute_insert(
        """
        INSERT INTO video_extraction_jobs
            (event_id, video_id, user_id, extraction_type, status, settings, expected_frames)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (event_id, video_id, user_id, settings.get("extraction_type", "interval"),
         JOB_STATUS_QUEUED, json.dumps(settings), expected_frames),
    )


def get_job(job_id: int) -> Optional[Dict[str, Any]]:
    rows = execute_query("SELECT * FROM video_extraction_jobs WHERE id = %s", (job_id,))
    return rows[0] if rows else None


def get_jobs_for_event(event_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    return execute_query(
        """
        SELECT j.*, v.original_filename, v.duration_sec, v.width AS video_width,
               v.height AS video_height, v.size_bytes AS video_size_bytes,
               v.file_path AS video_file_path, v.stored_filename
        FROM video_extraction_jobs j
        LEFT JOIN event_videos v ON v.id = j.video_id
        WHERE j.event_id = %s
        ORDER BY j.created_at DESC, j.id DESC
        LIMIT %s
        """,
        (event_id, limit),
    )


def update_job(job_id: int, **fields) -> None:
    if not fields:
        return
    sets, params = [], []
    for column, value in fields.items():
        sets.append(f"{column} = %s")
        params.append(json.dumps(value) if isinstance(value, dict) else value)
    params.append(job_id)
    execute_update(
        f"UPDATE video_extraction_jobs SET {', '.join(sets)} WHERE id = %s",
        tuple(params),
    )


def claim_job_for_processing(job_id: int) -> bool:
    """
    Atomically move a queued job to processing (idempotent restart guard).
    Returns False if the job is not queued anymore (claimed/retried).
    """
    rows = execute_query(
        """
        UPDATE video_extraction_jobs
        SET status = %s, stage = 'probe', started_at = COALESCE(started_at, %s), progress = 2
        WHERE id = %s AND status = %s
        RETURNING id
        """,
        (JOB_STATUS_PROCESSING, datetime.utcnow(), job_id, JOB_STATUS_QUEUED),
    )
    return bool(rows)


def increment_job_counter(job_id: int, counter: str, amount: int = 1) -> None:
    if counter not in {
        "candidate_frames", "rejected_blur", "rejected_duplicates",
        "rejected_faces", "preview_frames", "imported_photos", "retries",
    }:
        raise ValueError(f"Unknown counter {counter}")
    execute_update(
        f"UPDATE video_extraction_jobs SET {counter} = {counter} + %s WHERE id = %s",
        (amount, job_id),
    )


def set_job_error(job_id: int, message: str, stage: Optional[str] = None) -> None:
    execute_update(
        """
        UPDATE video_extraction_jobs
        SET status = %s, stage = COALESCE(%s, stage), error_message = %s,
            completed_at = %s, progress = CASE WHEN progress > 1 THEN progress ELSE 1 END
        WHERE id = %s
        """,
        (JOB_STATUS_FAILED, stage, message[:500], datetime.utcnow(), job_id),
    )


def mark_processing_jobs_interrupted() -> int:
    """
    Restart policy: jobs found in queued/processing after a server restart
    cannot resume mid-decode (ffmpeg subprocess is gone), so they become
    explicitly RETRYABLE failures with an actionable message instead of
    staying stuck forever.
    """
    return execute_update(
        """
        UPDATE video_extraction_jobs
        SET status = %s,
            error_message = %s,
            completed_at = %s,
            progress = CASE WHEN progress > 2 THEN progress ELSE 2 END
        WHERE status IN (%s, %s)
        """,
        (
            JOB_STATUS_FAILED,
            "Processing was interrupted by a server restart. The job is "
            "retryable: press Retry (audio/video files are kept).",
            datetime.utcnow(),
            JOB_STATUS_QUEUED,
            JOB_STATUS_PROCESSING,
        ),
    )


def cleanup_interrupted_jobs_tmp(job_ids: List[int]) -> None:
    """Clear partial counters of interrupted jobs so retries start clean."""
    if not job_ids:
        return
    placeholders = ", ".join(["%s"] * len(job_ids))
    execute_update_safely(
        f"""
        UPDATE video_extraction_jobs
        SET candidate_frames = 0, rejected_blur = 0, rejected_duplicates = 0,
            rejected_faces = 0, preview_frames = 0, expected_frames = 0,
            progress = 0, stage = NULL
        WHERE id IN ({placeholders}) AND status = %s
        """,
        (*job_ids, JOB_STATUS_FAILED),
    )


# ---------------------------------------------------------------------------
# Frames
# ---------------------------------------------------------------------------


def insert_frame(job_id: int, video_id: int, frame: Dict[str, Any]) -> Optional[int]:
    """
    Insert one analyzed frame. Returns the frame id, or None when another
    row with the same (job_id, timestamp_ms) already exists (retry races).
    """
    try:
        existing = execute_query(
            "SELECT id FROM video_extracted_frames WHERE job_id = %s AND timestamp_ms = %s",
            (job_id, frame["timestamp_ms"]),
        )
        if existing:
            return None
        return execute_insert(
            """
            INSERT INTO video_extracted_frames
                (job_id, video_id, frame_index, timestamp_ms, preview_path,
                 storage_type, width, height, file_size, blur_score,
                 quality_score, phash, has_faces, face_count,
                 frame_status, reject_reason)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                job_id, video_id, frame["frame_index"], frame["timestamp_ms"],
                frame["preview_path"], frame.get("storage_type", "local"),
                frame.get("width"), frame.get("height"), frame.get("file_size"),
                frame.get("blur_score"), frame.get("quality_score"),
                frame.get("phash"), frame.get("has_faces", False),
                frame.get("face_count", 0), frame["frame_status"],
                frame.get("reject_reason"),
            ),
        )
    except Exception as exc:  # unique-index race on retry
        logger.warning("insert_frame raced for job %s ts %s: %s", job_id, frame.get("timestamp_ms"), exc)
        return None


def get_frame(frame_id: int) -> Optional[Dict[str, Any]]:
    rows = execute_query("SELECT * FROM video_extracted_frames WHERE id = %s", (frame_id,))
    return rows[0] if rows else None


def delete_job_frames(job_id: int) -> int:
    """Remove all frame rows of a job (used by retry for a clean re-run)."""
    return execute_update(
        "DELETE FROM video_extracted_frames WHERE job_id = %s", (job_id,)
    )


def frames_needing_analysis(job_id: int) -> List[Dict[str, Any]]:
    """Frames still marked candidate after a partial run (retry path)."""
    return execute_query(
        "SELECT * FROM video_extracted_frames WHERE job_id = %s AND frame_status = 'candidate'",
        (job_id,),
    )


def get_job_frames(
    job_id: int,
    frame_status: Optional[str] = None,
    limit: int = 48,
    offset: int = 0,
) -> Dict[str, Any]:
    where = "job_id = %s"
    params: List[Any] = [job_id]
    if frame_status and frame_status != "all":
        where += " AND frame_status = %s"
        params.append(frame_status)
    params_fetch = list(params)
    rows = execute_query(
        f"""
        SELECT f.*, p.id AS photo_id
        FROM video_extracted_frames f
        LEFT JOIN photos p ON p.id = f.imported_photo_id
        WHERE {where}
        ORDER BY f.timestamp_ms ASC, f.id ASC
        LIMIT %s OFFSET %s
        """,
        (*params_fetch, limit, offset),
    )
    total_rows = execute_query(
        f"SELECT COUNT(*) AS total FROM video_extracted_frames WHERE {where}",
        tuple(params),
    )
    status_counts_rows = execute_query(
        """
        SELECT frame_status, COUNT(*) AS count
        FROM video_extracted_frames
        WHERE job_id = %s
        GROUP BY frame_status
        """,
        (job_id,),
    )
    status_counts = {r["frame_status"]: r["count"] for r in (status_counts_rows or [])}
    return {
        "frames": rows or [],
        "total": total_rows[0]["total"] if total_rows else 0,
        "status_counts": status_counts,
    }


# ---------------------------------------------------------------------------
# Import (provenance + idempotency)
# ---------------------------------------------------------------------------


def import_frames_into_photos(
    job: Dict[str, Any],
    frame_ids: List[int],
    persist_file,  # callable(frame_row) -> (stored_rel_path, storage_type)
    photographer_user_id: int,
) -> Dict[str, Any]:
    """
    Import selected preview frames as ordinary event photos, in ONE
    transaction. Each frame row is locked (FOR UPDATE) and only imported
    if still a 'preview' (immutable marker afterwards), so repeated
    requests cannot duplicate photos.

    Selected frames become ordinary event photos flagged with
    source_video_id / source_timestamp_ms so provenance is preserved.
    Clustering is untouched here: it stays an explicit organizer action.
    """
    imported, skipped = 0, 0
    photo_ids: List[int] = []
    with DatabaseTransaction() as cursor:
        if len(frame_ids) == 1:
            id_list_sql = "%s"
            params = [frame_ids[0]]
        else:
            id_list_sql = ", ".join(["%s"] * len(frame_ids))
            params = list(frame_ids)
        cursor.execute(
            f"""
            SELECT f.id, f.timestamp_ms, f.preview_path, f.width, f.height, f.file_size
            FROM video_extracted_frames f
            WHERE f.job_id = %s AND f.id IN ({id_list_sql})
              AND f.frame_status = 'preview'
            FOR UPDATE
            """,
            [job["id"], *params],
        )
        pending = [
            {
                "id": r["id"],
                "timestamp_ms": r["timestamp_ms"],
                "preview_path": r["preview_path"],
            }
            for r in cursor.fetchall()
        ]

        for frame_row in pending:
            stored_path, storage_type = persist_file(frame_row)
            now = datetime.now()
            cursor.execute(
                """
                INSERT INTO photos
                    (event_id, user_id, file_path, storage_type, original_filename,
                     mime_type, file_size, upload_date, source_video_id, source_timestamp_ms)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    job["event_id"], photographer_user_id, stored_path, storage_type,
                    _import_filename(frame_row), "image/jpeg", frame_row.get("file_size") or 0,
                    now, job.get("video_id"), frame_row["timestamp_ms"],
                ),
            )
            photo_id = cursor.fetchone()["id"]
            photo_ids.append(photo_id)
            cursor.execute(
                """
                UPDATE video_extracted_frames
                SET frame_status = 'imported', imported_photo_id = %s
                WHERE id = %s AND frame_status = 'preview'
                """,
                (photo_id, frame_row["id"]),
            )
            imported += 1

        skipped = len(frame_ids) - imported
        if imported:
            cursor.execute(
                """
                UPDATE video_extraction_jobs
                SET imported_photos = imported_photos + %s
                WHERE id = %s
                """,
                (imported, job["id"]),
            )
    return {"imported": imported, "skipped": skipped, "photo_ids": photo_ids}


def _import_filename(frame_row: Dict[str, Any]) -> str:
    ts = int(frame_row.get("timestamp_ms") or 0)
    return f"{uuid.uuid4().hex}_t{ts}.jpg"
