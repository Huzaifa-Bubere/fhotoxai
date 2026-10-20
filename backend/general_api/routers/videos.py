"""
Video-to-Photo extraction API.

Endpoints (all session-authenticated; identity comes from the session
middleware — never from client-supplied user IDs):

  GET   /videos/limits                              -> client-safe limits
  POST  /videos/events/{event_id}/upload            -> stream upload + create job
  GET   /videos/events/{event_id}/jobs              -> event job history
  GET   /videos/jobs/{job_id}                       -> job details + progress
  GET   /videos/jobs/{job_id}/frames                -> paginated frame previews
  GET   /videos/frames/{frame_id}/file              -> auth-checked preview image
  POST  /videos/jobs/{job_id}/import                -> import selected frames
  POST  /videos/jobs/{job_id}/cancel                -> cancel a running job
  POST  /videos/jobs/{job_id}/retry                 -> re-queue failed/cancelled
  DELETE /videos/jobs/{job_id}                      -> delete job asset(s)

Uploads stream to disk in fixed-size chunks (never fully in RAM), media
content is validated with ffprobe, videos that exceed configurable
application limits are rejected, extraction runs in the bounded
background worker, and frame previews stay private (not under the
public /uploads mount) — they are served through the access-checked
file endpoint instead.
"""

import logging
import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from general_api.auth_utils import assert_event_access, require_roles
from general_api.config import BASE_DIR, DOWNLOADS_DIR, UPLOADS_DIR
from general_api.database import execute_query
from general_api.services import video_ffmpeg
from general_api.services import video_store as store
from general_api.services import video_worker
from general_api.services.video_config import load_video_settings
from general_api.services.s3_service import upload_file_to_s3, delete_file_from_s3

logger = logging.getLogger("videos_router")

router = APIRouter(prefix="/videos", tags=["videos"])

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv"}
ALLOWED_VIDEO_MIMES = {
    "video/mp4", "video/quicktime", "video/webm", "video/x-m4v",
    "video/x-msvideo", "video/x-matroska", "application/octet-stream",
}
UPLOAD_CHUNK_BYTES = 1024 * 1024  # stream 1 MiB chunks, never whole file in RAM


def _safe_extension(filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    return ext if ext in ALLOWED_VIDEO_EXTENSIONS else ".mp4"


def _event_finalized(event_id: int) -> bool:
    rows = execute_query(
        "SELECT photos_upload_complete FROM events WHERE id = %s", (event_id,)
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Event not found.")
    return bool(rows[0].get("photos_upload_complete"))


def _job_with_access_guard(job_id: int, current_user: dict) -> dict:
    job = store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Video job not found.")
    assert_event_access(current_user, int(job["event_id"]), {"organizer", "photographer"})
    return job


# ---------------------------------------------------------------------------
# Limits
# ---------------------------------------------------------------------------


@router.get("/limits")
async def get_limits(current_user: dict = Depends(require_roles("organizer", "photographer"))):
    return load_video_settings().to_public_dict()


# ---------------------------------------------------------------------------
# Upload + job creation
# ---------------------------------------------------------------------------


@router.post("/events/{event_id}/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_video(
    event_id: int,
    file: UploadFile = File(...),
    interval_sec: float = Form(1.0),
    start_sec: Optional[float] = Form(None),
    end_sec: Optional[float] = Form(None),
    faces_only: bool = Form(False),
    blur_filter: bool = Form(True),
    duplicate_filter: bool = Form(True),
    current_user: dict = Depends(require_roles("organizer", "photographer")),
):
    """
    Stream a video upload straight to disk (bounded RAM), validate its
    real media content with ffprobe, persist an event_videos row, and
    queue an extraction job. Returns the job id immediately; extraction
    happens in the background worker (poll GET /videos/jobs/{id}).
    """
    settings = load_video_settings()
    assert_event_access(current_user, event_id, {"organizer", "photographer"})
    if _event_finalized(event_id):
        raise HTTPException(
            status_code=409,
            detail="Uploads for this event are finalized; no videos can be added.",
        )

    filename = file.filename or "video.mp4"
    ext = _safe_extension(filename)
    if ext == ".mp4" and (filename or "").lower().endswith(
        tuple(e for e in ALLOWED_VIDEO_EXTENSIONS if e != ".mp4")
    ):
        ext = os.path.splitext(filename.lower())[1]
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported container '{ext}'. Allowed: MP4, MOV, WebM (and AVI/MKV where decoders exist).",
        )
    if file.content_type and file.content_type != "application/octet-stream":
        if file.content_type not in ALLOWED_VIDEO_MIMES:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported media type '{file.content_type}'.",
            )

    allowed = settings.allowed_interval_values()
    try:
        interval_val = float(interval_sec)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="interval_sec must be a number.")
    if interval_val not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"interval_sec must be one of {allowed} seconds.",
        )

    start_val = start_sec if start_sec is not None else 0.0
    end_val = end_sec if end_sec is not None else None
    if start_val < 0 or (end_val is not None and end_val <= start_val):
        raise HTTPException(
            status_code=422, detail="end_sec must be greater than start_sec."
        )
    if end_val is not None and end_val > settings.max_duration_sec:
        raise HTTPException(
            status_code=422,
            detail=f"Selected range exceeds the {settings.max_duration_sec}s duration limit.",
        )

    if faces_only:
        try:
            video_worker.get_or_create_worker()._load_face_service(settings)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=422,
                detail=f"{exc}",
            )

    # ---- Stream to disk (bounded RAM) ------------------------------------
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    video_dir = os.path.join(UPLOADS_DIR, f"event_{event_id}", "videos")
    os.makedirs(video_dir, exist_ok=True)
    disk_path = os.path.join(video_dir, stored_filename)

    max_bytes = settings.max_upload_bytes()
    size_bytes = 0
    try:
        with open(disk_path, "wb") as sink:
            while True:
                chunk = await file.read(UPLOAD_CHUNK_BYTES)
                if not chunk:
                    break
                size_bytes += len(chunk)
                if size_bytes > max_bytes:
                    sink.close()
                    os.remove(disk_path)
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"Video exceeds the {settings.max_upload_mb} MB upload limit "
                            f"(received {size_bytes / (1024 * 1024):.1f} MB)."
                        ),
                    )
                sink.write(chunk)
    except HTTPException:
        raise
    except OSError as exc:
        logger.error("Disk write failed for event %s video: %s", event_id, exc)
        raise HTTPException(status_code=500, detail="Could not store the uploaded video.")
    finally:
        await file.close()

    # ---- Validate actual content with ffprobe ----------------------------
    rel_path = os.path.relpath(disk_path, BASE_DIR).replace("\\", "/")
    try:
        meta = video_ffmpeg.probe_video(disk_path, ffprobe_bin=settings.ffprobe_bin, timeout=60)
    except video_ffmpeg.FFmpegNotFoundError as exc:
        os.remove(disk_path)
        raise HTTPException(status_code=500, detail=str(exc))
    except video_ffmpeg.VideoValidationError as exc:
        os.remove(disk_path)
        raise HTTPException(status_code=422, detail=str(exc))

    problems = video_worker.VideoWorker._limit_violations(meta, settings)
    if problems:
        os.remove(disk_path)
        raise HTTPException(status_code=413, detail=" ".join(problems))

    video_id = store.create_event_video(
        event_id=event_id,
        user_id=current_user["id"],
        original_filename=filename,
        stored_filename=stored_filename,
        mime_type=file.content_type or "video/mp4",
        size_bytes=size_bytes,
        storage_type="local",
        file_path=rel_path,
    )
    store.update_video_probe(video_id, meta, probe_failed=False)

    settings_payload = {
        "extraction_type": "interval",
        "interval_sec": interval_val,
        "start_sec": start_val,
        "end_sec": end_val,
        "faces_only": bool(faces_only),
        "blur_filter": bool(blur_filter),
        "duplicate_filter": bool(duplicate_filter),
    }
    expected = max(
        0,
        video_ffmpeg.estimate_frame_count(
            (end_val if end_val is not None else float(meta["duration_sec"])) - start_val,
            interval_val,
            settings.max_candidate_frames,
        ),
    )
    job_id = store.create_extraction_job(
        event_id=event_id,
        video_id=video_id,
        user_id=current_user["id"],
        settings=settings_payload,
        expected_frames=expected,
    )

    # Honor the user's filter toggles (blur/duplicate off => disable).
    worker = video_worker.get_or_create_worker()
    worker.enqueue(job_id, prioritize=True)

    return {
        "status": "queued",
        "job_id": job_id,
        "video_id": video_id,
        "message": "Upload accepted; extraction queued.",
        "limits": settings.to_public_dict(),
        "video": {
            "duration_sec": meta["duration_sec"],
            "width": meta["width"],
            "height": meta["height"],
            "fps": meta["fps"],
            "rotation_deg": meta["rotation_deg"],
            "container": meta["container"],
            "codec": meta["codec_name"],
        },
    }


# ---------------------------------------------------------------------------
# Job listing / details
# ---------------------------------------------------------------------------


def _serialize_job(job: dict) -> dict:
    import json

    raw_settings = job.get("settings") or {}
    if isinstance(raw_settings, str):
        try:
            raw_settings = json.loads(raw_settings)
        except Exception:  # noqa: BLE001
            raw_settings = {}
    return {
        "id": job["id"],
        "event_id": job["event_id"],
        "video_id": job.get("video_id"),
        "extraction_type": job.get("extraction_type") or "interval",
        "status": job.get("status"),
        "stage": job.get("stage"),
        "progress": int(job.get("progress") or 0),
        "settings": raw_settings,
        "counters": {
            "candidate_frames": job.get("candidate_frames") or 0,
            "rejected_blur": job.get("rejected_blur") or 0,
            "rejected_duplicates": job.get("rejected_duplicates") or 0,
            "rejected_faces": job.get("rejected_faces") or 0,
            "preview_frames": job.get("preview_frames") or 0,
            "imported_photos": job.get("imported_photos") or 0,
            "expected_frames": job.get("expected_frames") or 0,
        },
        "imported_photos": job.get("imported_photos") or 0,
        "error_message": job.get("error_message"),
        "retries": job.get("retries") or 0,
        "created_at": job.get("created_at"),
        "started_at": job.get("started_at"),
        "completed_at": job.get("completed_at"),
        "video": {
            "id": job.get("video_id"),
            "original_filename": job.get("original_filename"),
            "duration_sec": job.get("duration_sec"),
            "width": job.get("video_width"),
            "height": job.get("video_height"),
            "size_bytes": job.get("video_size_bytes"),
        },
    }


@router.get("/events/{event_id}/jobs")
async def list_event_jobs(
    event_id: int,
    current_user: dict = Depends(require_roles("organizer", "photographer")),
):
    assert_event_access(current_user, event_id, {"organizer", "photographer"})
    jobs = store.get_jobs_for_event(event_id)
    return {"jobs": [_serialize_job(j) for j in jobs]}


@router.get("/jobs/{job_id}")
async def get_job_details(
    job_id: int,
    current_user: dict = Depends(require_roles("organizer", "photographer")),
):
    job = _job_with_access_guard(job_id, current_user)
    payload = _serialize_job(job)
    frames = store.get_job_frames(job_id, frame_status="all", limit=1)
    payload["status_counts"] = {
        "candidate": frames["status_counts"].get("candidate", 0),
        "preview": frames["status_counts"].get("preview", 0),
        "imported": frames["status_counts"].get("imported", 0),
        "rejected_blur": frames["status_counts"].get("rejected_blur", 0),
        "rejected_duplicate": frames["status_counts"].get("rejected_duplicate", 0),
        "rejected_faces": frames["status_counts"].get("rejected_faces", 0),
    }
    return payload


# ---------------------------------------------------------------------------
# Frame previews
# ---------------------------------------------------------------------------


@router.get("/jobs/{job_id}/frames")
async def get_job_frames(
    job_id: int,
    frame_status: str = Query("preview", description="preview|candidate|imported|all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    current_user: dict = Depends(require_roles("organizer", "photographer")),
):
    job = _job_with_access_guard(job_id, current_user)
    data = store.get_job_frames(
        job_id,
        frame_status=frame_status,
        limit=page_size,
        offset=(page - 1) * page_size,
    )
    frames = []
    for row in data["frames"]:
        frames.append({
            "id": row["id"],
            "frame_index": row["frame_index"],
            "timestamp_ms": row["timestamp_ms"],
            "preview_url": f"/api/videos/frames/{row['id']}/file",
            "blur_score": row.get("blur_score"),
            "quality_score": row.get("quality_score"),
            "phash": row.get("phash"),
            "has_faces": row.get("has_faces"),
            "face_count": row.get("face_count"),
            "frame_status": row.get("frame_status"),
            "width": row.get("width"),
            "height": row.get("height"),
            "file_size": row.get("file_size"),
            "imported_photo_id": row.get("imported_photo_id"),
            "photo_id": row.get("photo_id"),
        })
    total_pages = max(1, -(-data["total"] // page_size))
    return {
        "job_id": job_id,
        "job_status": job.get("status"),
        "page": page,
        "page_size": page_size,
        "total": data["total"],
        "total_pages": total_pages,
        "status_counts": data["status_counts"],
        "frames": frames,
    }


@router.get("/frames/{frame_id}/file")
async def get_frame_file(
    frame_id: int,
    current_user: dict = Depends(require_roles("organizer", "photographer")),
):
    """Access-checked frame preview (frames are NOT publicly mounted)."""
    frame = store.get_frame(frame_id)
    if not frame:
        raise HTTPException(status_code=404, detail="Frame not found.")
    _job_with_access_guard(frame["job_id"], current_user)
    rel = str(frame.get("preview_path") or "")
    abs_path = os.path.join(DOWNLOADS_DIR, rel.replace("\\", "/"))
    if not os.path.exists(abs_path):
        raise HTTPException(
            status_code=410,
            detail="Frame preview file has been cleaned up; re-run the extraction job.",
        )
    return FileResponse(abs_path, media_type="image/jpeg")


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------


@router.post("/jobs/{job_id}/import")
async def import_selected_frames(
    job_id: int,
    frame_ids: List[int] = Form(None),
    current_user: dict = Depends(require_roles("organizer", "photographer")),
):
    job = _job_with_access_guard(job_id, current_user)
    if job.get("status") != store.JOB_STATUS_COMPLETED:
        raise HTTPException(
            status_code=409,
            detail="Frames can only be imported once the extraction job has completed.",
        )
    if _event_finalized(int(job["event_id"])):
        raise HTTPException(
            status_code=409,
            detail="Uploads for this event are finalized; importing is disabled.",
        )
    if isinstance(frame_ids, int):
        frame_ids = [frame_ids]
    frame_ids = sorted({int(f) for f in (frame_ids or [])})
    if not frame_ids:
        raise HTTPException(status_code=422, detail="Select at least one frame to import.")
    settings = load_video_settings()
    if len(frame_ids) > settings.max_import_per_request:
        raise HTTPException(
            status_code=422,
            detail=f"At most {settings.max_import_per_request} frames per import request.",
        )

    def persist_file(frame_row):
        """Copy the frame into the event's photo storage (S3 like photos, else local)."""
        frame = store.get_frame(frame_row["id"])
        abs_path = os.path.join(
            DOWNLOADS_DIR, str(frame["preview_path"]).replace("\\", "/")
        )
        if not os.path.exists(abs_path):
            raise HTTPException(
                status_code=410,
                detail="Frame files were cleaned up; re-run the job and reselect.",
            )
        photo_dir = os.path.join(
            UPLOADS_DIR, f"event_{job['event_id']}", f"video_source_{job.get('video_id')}"
        )
        os.makedirs(photo_dir, exist_ok=True)
        unique_name = f"{frame_row['id']}_{uuid.uuid4().hex}.jpg"
        bucket_name = os.environ.get("AWS_S3_BUCKET_NAME", "photo-cluster-frontend")
        s3_key = f"uploads/event_{job['event_id']}/video_source_{job.get('video_id')}/{unique_name}"
        storage_type = "local"
        with open(abs_path, "rb") as handle:
            if upload_file_to_s3(handle, bucket_name, s3_key, "image/jpeg"):
                storage_type = "s3"
                stored_path = s3_key
            else:
                stored_path = os.path.join(photo_dir, unique_name)
                with open(stored_path, "wb") as sink:
                    handle.seek(0)
                    sink.write(handle.read())
                stored_path = os.path.relpath(stored_path, BASE_DIR).replace("\\", "/")
        return stored_path, storage_type

    result = store.import_frames_into_photos(
        job=job,
        frame_ids=frame_ids,
        persist_file=persist_file,
        photographer_user_id=current_user["id"],
    )
    return {
        "status": "success",
        "imported": result["imported"],
        "skipped": result["skipped"],
        "photo_ids": result["photo_ids"],
        "message": (
            f"Imported {result['imported']} photo(s)"
            + (f", skipped {result['skipped']} already imported." if result["skipped"] else ".")
        ),
    }


# ---------------------------------------------------------------------------
# Cancel / retry / cleanup
# ---------------------------------------------------------------------------


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: int,
    current_user: dict = Depends(require_roles("organizer", "photographer")),
):
    job = _job_with_access_guard(job_id, current_user)
    is_admin = (current_user.get("role") or "") == "admin"
    try:
        return video_worker.cancel_job(job_id, int(current_user["id"]), is_admin=is_admin)
    except KeyError:
        raise HTTPException(status_code=404, detail="Video job not found.")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You can only cancel your own jobs.")


@router.post("/jobs/{job_id}/retry")
async def retry_job(
    job_id: int,
    current_user: dict = Depends(require_roles("organizer", "photographer")),
):
    job = _job_with_access_guard(job_id, current_user)
    is_admin = (current_user.get("role") or "") == "admin"
    try:
        return video_worker.retry_job(job_id, int(current_user["id"]), is_admin=is_admin)
    except KeyError:
        raise HTTPException(status_code=404, detail="Video job not found.")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You can only retry your own jobs.")


@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: int,
    current_user: dict = Depends(require_roles("organizer", "photographer")),
):
    """Delete a video job and all of its assets (frames + source video)."""
    job = _job_with_access_guard(job_id, current_user)
    is_admin = (current_user.get("role") or "") == "admin"
    if not (is_admin or int(job.get("user_id") or 0) == int(current_user["id"])):
        raise HTTPException(status_code=403, detail="You can only delete your own jobs.")
    if job.get("status") in store.ACTIVE_STATUSES:
        store.update_job(job_id, status=store.JOB_STATUS_CANCELLED, cancelled_at=datetime.utcnow())

    shutil_job_dir = os.path.join(
        video_worker.VideoWorker.jobs_root(), f"job_{job_id}"
    )
    if os.path.isdir(shutil_job_dir):
        import shutil as _shutil
        _shutil.rmtree(shutil_job_dir, ignore_errors=True)

    video = store.get_video(job.get("video_id")) if job.get("video_id") else None
    if video:
        video_variants = execute_query(
            "SELECT id FROM video_extraction_jobs WHERE video_id = %s", (video["id"],)
        )
        if len(video_variants or []) <= 1:
            abs_path = os.path.join(BASE_DIR, str(video.get("file_path") or "").replace("\\", "/"))
            if video.get("storage_type") == "s3" and video.get("file_path"):
                # S3 stored source; best-effort removal.
                try:
                    delete_file_from_s3(
                        os.environ.get("AWS_S3_BUCKET_NAME", "photo-cluster-frontend"),
                        str(video["file_path"]),
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning("S3 delete failed for video %s: %s", video["id"], exc)
            elif os.path.exists(abs_path):
                try:
                    os.remove(abs_path)
                except OSError as exc:
                    logger.warning("Could not remove video file %s: %s", abs_path, exc)
            event_video_dir = os.path.dirname(abs_path)
            if os.path.isdir(event_video_dir) and not os.listdir(event_video_dir):
                try:
                    os.rmdir(event_video_dir)
                except OSError:
                    pass
    store.delete_job_frames(job_id)
    store.delete_video_file_record(job.get("video_id")) if job.get("video_id") else None
    execute_query("DELETE FROM video_extraction_jobs WHERE id = %s", (job_id,))
    return {"status": "success", "message": "Video job and assets deleted."}
