"""
Bounded background worker for video extraction jobs.

Design:
- A small thread pool (default 1 job at a time, configurable) consumes
  jobs persisted in PostgreSQL. Nothing heavy runs inside request
  handlers; uploads only stream to disk and enqueue.
- Stages: probe -> extract -> analyze -> ready. Progress percentages are
  computed from real work (output files produced / frames analyzed),
  never fabricated.
- Cancellation: flipping the DB status suffices; every ffmpeg run polls
  a cancellation callable. On cancel the worker terminates the
  subprocess, leaves the job as 'cancelled' in the DB, deletes its
  temporary frame files and keeps the video on disk for retry.
- Failure: jobs end in 'failed' with an actionable error message.
- Restart: on API startup, interrupted jobs (queued/processing) are
  explicitly marked failed-retryable and their partial temp files are
  removed; the source video stays on disk so a retry re-extracts from
  scratch without duplicate frame rows (job counters reset).

Storage-local by design: everything lives on the general-api container's
own volumes (uploads/downloads), so no AWS credentials are required.
"""

import json
import logging
import os
import queue
import shutil
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional

from general_api.services import video_config
from general_api.services import video_ffmpeg as ffmpeg
from general_api.services import video_frame_analysis as analysis
from general_api.services import video_store as store

logger = logging.getLogger("video_worker")

_STAGE_PROGRESS = {"probe": 4, "extract_start": 12, "analyze_start": 70, "analyze_end": 96}


def _status_for_reject(reject_reason: Optional[str]) -> str:
    if not reject_reason:
        return "preview"
    if reject_reason.startswith("blurry") or reject_reason == "unreadable_frame":
        return "rejected_blur"
    if reject_reason == "duplicate":
        return "rejected_duplicate"
    if reject_reason == "faces_only_filter":
        return "rejected_faces"
    return "rejected_blur"  # unknown reasons reject conservatively with a note


class _JobCancelled(Exception):
    """Internal signal: the job was cancelled while it was running."""


class VideoWorker:
    def __init__(self, settings: Optional[Any] = None):
        self.settings = settings or video_config.load_video_settings()
        self._queue: "queue.Queue[int]" = queue.Queue(maxsize=200)
        self._threads: List[threading.Thread] = []
        self._stop = threading.Event()
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        if not self.settings.worker_enabled:
            logger.info("Video worker disabled (VIDEO_WORKER_ENABLED=0).")
            return
        with self._lock:
            if self._threads:
                return
            count = max(1, int(self.settings.max_concurrent_jobs))
            for index in range(count):
                thread = threading.Thread(
                    target=self._run_loop, name=f"video-worker-{index}", daemon=True
                )
                thread.start()
                self._threads.append(thread)
        logger.info("Video worker started with %s thread(s).", count)

    def stop(self, drain_timeout: float = 3.0) -> None:
        self._stop.set()
        for thread in self._threads:
            thread.join(timeout=drain_timeout)

    @property
    def queued_count(self) -> int:
        return self._queue.qsize()

    def enqueue(self, job_id: int, prioritize: bool = False) -> None:
        try:
            if prioritize:
                self._queue.put(job_id, block=True, timeout=0.5)
            else:
                self._queue.put(job_id, block=True, timeout=2.0)
        except queue.Full:
            logger.error(
                "Video worker in-memory queue is full; job %s stays 'queued' in the DB.",
                job_id,
            )

    # ------------------------------------------------------------------
    # Loop
    # ------------------------------------------------------------------

    def _run_loop(self) -> None:
        while not self._stop.is_set():
            try:
                job_id = self._queue.get(timeout=1.0)
            except queue.Empty:
                continue
            try:
                self._process_job(job_id)
            except Exception as exc:  # noqa: BLE001 - the worker must never die
                logger.exception("Unhandled error processing video job %s", job_id)
                try:
                    store.set_job_error(job_id, f"Internal worker error: {exc}")
                    self._cleanup_job_dir(job_id)
                except Exception:  # noqa: BLE001
                    pass
            finally:
                try:
                    self._queue.task_done()
                except ValueError:
                    pass

    # ------------------------------------------------------------------
    # Pipeline
    # ------------------------------------------------------------------

    def _process_job(self, job_id: int) -> None:
        settings = video_config.load_video_settings()
        job = store.get_job(job_id)
        if job is None or job.get("status") != store.JOB_STATUS_QUEUED:
            return

        # Atomic claim guards against double-processing after restarts.
        if not store.claim_job_for_processing(job_id):
            return

        job = store.get_job(job_id) or job
        job_settings = job.get("settings") or {}
        if isinstance(job_settings, str):
            try:
                job_settings = json.loads(job_settings)
            except Exception:  # noqa: BLE001
                job_settings = {}

        job_dir = os.path.join(self.jobs_root(), f"job_{job_id}")
        try:
            os.makedirs(job_dir, exist_ok=True)

            video = store.get_video(video_id) if job.get("video_id") else None
            source_path = self._resolve_source_path(video) if video else None

            # ---------------- Stage: probe ----------------
            store.update_job(job_id, stage="probe", progress=_STAGE_PROGRESS["probe"])
            meta = self._probe_and_validate(source_path, job, video, settings)

            # ---------------- Stage: extract ----------------
            start_sec = float(job_settings.get("start_sec") or 0.0)
            end_sec = job_settings.get("end_sec")
            interval = self._resolve_interval(job_settings, settings)
            span_end = end_sec if end_sec is not None else min(
                float(meta["duration_sec"]), float(settings.max_duration_sec)
            )
            expected = ffmpeg.estimate_frame_count(
                span_end - start_sec, interval, settings.max_candidate_frames
            )
            if expected <= 0:
                raise ffmpeg.VideoValidationError(
                    "The selected time range is shorter than one extraction interval, "
                    "so no frames would be sampled. Use a shorter interval or clear "
                    "the start/end range."
                )
            store.update_job(
                job_id,
                stage="extract",
                progress=_STAGE_PROGRESS["extract_start"],
                expected_frames=expected,
            )
            frames = self._extract_with_progress(
                job_id, source_path, job_dir, interval, start_sec, end_sec, expected, settings
            )

            # ---------------- Stage: analyze ----------------
            store.update_job(job_id, stage="analyze", progress=_STAGE_PROGRESS["analyze_start"])
            self._analyze_frames(
                job_id, job, frames, interval, start_sec, settings
            )

            # ---------------- Done ----------------
            preview_total = self._count_previews(job_id)
            store.update_job(
                job_id,
                status=store.JOB_STATUS_COMPLETED,
                stage="ready",
                progress=100,
                completed_at=datetime.utcnow(),
                preview_frames=preview_total,
            )
            self._cleanup_job_dir(job_id)
            logger.info("Video job %s completed: %s preview frame(s).", job_id, preview_total)
        except _JobCancelled:
            logger.info("Video job %s was cancelled mid-run; job left in DB as cancelled.", job_id)
            self._cleanup_job_dir(job_id)
        except ffmpeg.VideoValidationError as exc:
            store.set_job_error(job_id, str(exc), stage=None)
            self._cleanup_job_dir(job_id)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Video job %s failed", job_id)
            store.set_job_error(job_id, f"Extraction failed: {exc}", stage=None)
            self._cleanup_job_dir(job_id)

    @staticmethod
    def jobs_root() -> str:
        from general_api.config import DOWNLOADS_DIR
        return os.path.join(DOWNLOADS_DIR, "video_jobs")

    def _cleanup_job_dir(self, job_id: int) -> None:
        shutil.rmtree(os.path.join(self.jobs_root(), f"job_{job_id}"), ignore_errors=True)

    def _resolve_source_path(self, video: Dict[str, Any]) -> str:
        from general_api.config import BASE_DIR
        raw = video.get("file_path") or ""
        candidate = os.path.join(BASE_DIR, str(raw).replace("\\", "/"))
        if os.path.exists(candidate):
            return candidate
        raise ffmpeg.VideoValidationError(
            "The uploaded video file is missing on the server. Please re-upload it.",
            {"kind": "source_missing"},
        )

    def _resolve_interval(self, job_settings: Dict[str, Any], settings: Any) -> float:
        allowed = settings.allowed_interval_values()
        default = float(settings.default_interval)
        try:
            interval = float(job_settings.get("interval_sec", default))
        except (TypeError, ValueError):
            interval = default
        if interval in allowed:
            return interval
        nearest = min(allowed, key=lambda v: abs(v - interval))
        logger.warning(
            "Requested interval %s is not allowed; snapping to nearest %s.", interval, nearest
        )
        return nearest

    def _probe_and_validate(
        self, source_path: str, job: Dict[str, Any], video: Optional[Dict[str, Any]], settings: Any
    ) -> Dict[str, Any]:
        if not source_path:
            raise ffmpeg.VideoValidationError(
                "No source video is attached to this job.", {"kind": "no_source"}
            )
        meta = ffmpeg.probe_video(source_path, ffprobe_bin=settings.ffprobe_bin, timeout=60)
        problems = self._limit_violations(meta, settings)
        if problems:
            raise ffmpeg.VideoValidationError(" ".join(problems), {"kind": "limits_off"})
        if video:
            store.update_video_probe(video["id"], meta, probe_failed=False)
        return meta

    @staticmethod
    def _limit_violations(meta: Dict[str, Any], settings: Any) -> List[str]:
        problems: List[str] = []
        duration = meta.get("duration_sec") or 0
        if duration > settings.max_duration_sec + 0.5:
            problems.append(
                f"Video duration {duration:.1f}s exceeds the configured limit of "
                f"{settings.max_duration_sec}s."
            )
        long_side = max(meta.get("width") or 0, meta.get("height") or 0)
        if long_side > settings.max_frame_side_px:
            problems.append(
                f"Resolution {meta.get('width')}x{meta.get('height')} exceeds the configured "
                f"limit of {settings.max_frame_side_px}px on the long side."
            )
        return problems

    def _extract_with_progress(
        self,
        job_id: int,
        source_path: str,
        job_dir: str,
        interval: float,
        start_sec: float,
        end_sec: Optional[float],
        expected: int,
        settings: Any,
    ) -> List[Dict[str, Any]]:
        output_pattern = os.path.join(job_dir, "frame_%06d.jpg")
        cancelled_fn = self._cancelled_fn(job_id)
        frames, _stderr = ffmpeg.extract_frames_interval(
            source_path,
            output_pattern,
            interval_sec=interval,
            start_sec=start_sec,
            end_sec=end_sec,
            max_frames=settings.max_candidate_frames,
            jpeg_quality=settings.frame_jpeg_quality,
            timeout=settings.ffmpeg_timeout_sec,
            get_cancelled=cancelled_fn,
        )
        if cancelled_fn():
            raise _JobCancelled(job_id)
        out_dir = os.path.dirname(output_pattern)
        for frame in frames:
            frame["abs_path"] = os.path.join(out_dir, frame["filename"])
            frame["timestamp_source"] = frame.get("timestamp_source", "pts")
        return frames

    def _cancelled_fn(self, job_id: int):
        def _check() -> bool:
            try:
                job = store.get_job(job_id)
            except Exception as exc:  # noqa: BLE001 - DB down: abort run
                logger.error("Cannot re-read job %s for cancellation check: %s", job_id, exc)
                return True
            return (
                job is None
                or job.get("status") == store.JOB_STATUS_CANCELLED
                or not job.get("status")
            )
        return _check

    def _analyze_frames(
        self,
        job_id: int,
        job: Dict[str, Any],
        frames: List[Dict[str, Any]],
        interval: float,
        start_sec: float,
        settings: Any,
    ) -> None:
        job_settings = job.get("settings") or {}
        if isinstance(job_settings, str):
            try:
                job_settings = json.loads(job_settings)
            except Exception:  # noqa: BLE001
                job_settings = {}
        faces_only = bool(job_settings.get("faces_only"))
        video_record_id = job.get("video_id")

        face_service = None
        accepted_hashes: List[str] = []
        analyzed = 0
        total = max(1, len(frames))
        analyze_span = _STAGE_PROGRESS["analyze_end"] - _STAGE_PROGRESS["analyze_start"]
        progress = _STAGE_PROGRESS["analyze_start"]

        for record in frames:
            if self._cancelled_fn(job_id)():
                raise _JobCancelled(job_id)

            path = record["abs_path"]
            image = analysis.load_bgr_for_analysis(path)
            blur_var = analysis.laplacian_variance(image)
            quality = analysis.quality_score(image)
            phash = analysis.average_hash(image)
            timestamp_ms = int(round(record["timestamp_sec"] * 1000.0))
            file_size = os.path.getsize(path) if os.path.exists(path) else 0
            width = int(image.shape[1]) if image is not None else None
            height = int(image.shape[0]) if image is not None else None

            frame_row: Dict[str, Any] = {
                "frame_index": record["frame_index"],
                "timestamp_ms": timestamp_ms,
                "preview_path": f"video_jobs/job_{job_id}/{record['filename']}",
                "storage_type": "local",
                "blur_score": round(blur_var, 2),
                "quality_score": round(quality, 4),
                "phash": phash,
                "has_faces": False,
                "face_count": 0,
                "width": width,
                "height": height,
                "file_size": file_size,
                "frame_status": "candidate",
                "reject_reason": None,
            }

            reject_reason = self._evaluate_filters(
                image, blur_var, phash, accepted_hashes, faces_only, face_service, settings,
                frame_row,
            )
            face_service = self._last_face_service
            frame_status = _status_for_reject(reject_reason)
            frame_row["frame_status"] = frame_status
            frame_row["reject_reason"] = reject_reason
            if frame_status == "preview" and phash:
                accepted_hashes.append(phash)

            store.insert_frame(job_id, video_record_id, frame_row)
            counter_for = {
                "rejected_blur": "rejected_blur",
                "rejected_duplicate": "rejected_duplicates",
                "rejected_faces": "rejected_faces",
            }
            counter = counter_for.get(frame_status)
            if counter:
                store.increment_job_counter(job_id, counter, 1)

            analyzed += 1
            new_progress = _STAGE_PROGRESS["analyze_start"] + int(analyze_span * analyzed / total)
            new_progress = min(_STAGE_PROGRESS["analyze_end"], new_progress)
            if new_progress > progress:
                progress = new_progress
                store.update_job(job_id, progress=progress)

        store.increment_job_counter(job_id, "candidate_frames", analyzed)

    def _evaluate_filters(
        self, image, blur_var, phash, accepted_hashes, faces_only, face_service, settings,
        frame_row,
    ) -> Optional[str]:
        """Return a reject_reason string, or None when the frame is kept."""
        if image is None:
            return "unreadable_frame"
        if settings.blur_laplacian_min > 0 and blur_var < settings.blur_laplacian_min:
            return f"blurry({blur_var:.1f})"
        if settings.duplicate_hamming_max >= 0 and phash:
            if analysis.is_near_duplicate(
                phash,
                accepted_hashes,
                hamming_threshold=settings.duplicate_hamming_max,
                window=settings.duplicate_window,
            ):
                return "duplicate"
        if faces_only:
            face_service = face_service or self._load_face_service(settings)
            self._last_face_service = face_service
            faces = analysis.detect_faces(image, face_service)
            frame_row["face_count"] = len(faces)
            frame_row["has_faces"] = bool(faces)
            if not faces:
                return "faces_only_filter"
        return None

    _last_face_service = None

    def _load_face_service(self, settings):
        try:
            from general_api.services.face_service import face_service as shared
        except Exception as exc:  # noqa: BLE001
            raise analysis.FaceFilterUnavailable(
                f"Faces-only filter requested but the face service is unavailable: {exc}. "
                "Disable the filter and retry."
            )
        try:
            if not getattr(shared, "models_loaded", False):
                shared.load_models()
        except Exception as exc:  # noqa: BLE001
            raise analysis.FaceFilterUnavailable(
                f"Faces-only filter requested but the face models failed to load: {exc}. "
                "Disable the filter and retry."
            )
        return shared


# ===========================================================================
# Module-level control API (used by the router and app startup)
# ===========================================================================

_worker_lock = threading.Lock()
_default_worker: Optional[VideoWorker] = None


def get_or_create_worker() -> VideoWorker:
    global _default_worker
    with _worker_lock:
        if _default_worker is None:
            _default_worker = VideoWorker()
            _default_worker.start()
    return _default_worker


def get_default_worker() -> Optional[VideoWorker]:
    return _default_worker


def cancel_job(job_id: int, user_id: int, is_admin: bool = False) -> Dict[str, Any]:
    """Mark a job cancelled. Safe from request handlers: the pipeline still
    runs, but every stage polls status and terminates itself promptly."""
    job = store.get_job(job_id)
    if not job:
        raise KeyError("job_not_found")
    if not (is_admin or int(job.get("user_id") or 0) == int(user_id)):
        raise PermissionError("not_owner")
    if job.get("status") in {store.JOB_STATUS_COMPLETED, store.JOB_STATUS_CANCELLED}:
        return {"status": job["status"], "cancelled": False,
                "message": "Job already finished."}
    store.update_job(
        job_id,
        status=store.JOB_STATUS_CANCELLED,
        cancelled_at=datetime.utcnow(),
    )
    return {"status": store.JOB_STATUS_CANCELLED, "cancelled": True,
            "message": "Cancellation requested; the worker will stop shortly."}


def retry_job(job_id: int, user_id: int, is_admin: bool = False) -> Dict[str, Any]:
    """Re-queue a failed or cancelled job for a completely fresh pass.
    Previous frame rows are deleted and counters reset so the retry cannot
    double-count or duplicate rows (the (job_id, timestamp_ms) unique index
    would otherwise silently skip re-inserted frames)."""
    job = store.get_job(job_id)
    if not job:
        raise KeyError("job_not_found")
    if not (is_admin or int(job.get("user_id") or 0) == int(user_id)):
        raise PermissionError("not_owner")
    status = job.get("status")
    if status in {store.JOB_STATUS_QUEUED, store.JOB_STATUS_PROCESSING}:
        return {"status": status, "retried": False, "message": "Job already running."}
    if status == store.JOB_STATUS_COMPLETED:
        return {"status": status, "retried": False,
                "message": "Job already completed; re-extracting would only duplicate work."}

    worker = get_or_create_worker()
    worker._cleanup_job_dir(job_id)
    store.delete_job_frames(job_id)
    store.update_job(
        job_id,
        status=store.JOB_STATUS_QUEUED,
        stage=None,
        progress=0,
        error_message=None,
        expected_frames=0,
        candidate_frames=0,
        rejected_blur=0,
        rejected_duplicates=0,
        rejected_faces=0,
        preview_frames=0,
        started_at=None,
        completed_at=None,
        cancelled_at=None,
        retries=(job.get("retries") or 0) + 1,
    )
    worker.enqueue(job_id, prioritize=True)
    return {"status": store.JOB_STATUS_QUEUED, "retried": True,
            "message": "Job re-queued for processing."}


def recover_interrupted_jobs() -> Dict[str, Any]:
    """Startup recovery. Policy: ffmpeg subprocesses cannot survive a
    restart, so interrupted jobs become explicitly retryable failures
    with an actionable message instead of staying stuck as 'processing'.
    Partial temp frame files are deleted; source videos stay on disk."""
    try:
        active = store.execute_query(
            "SELECT id FROM video_extraction_jobs WHERE status IN (%s, %s)",
            (store.JOB_STATUS_QUEUED, store.JOB_STATUS_PROCESSING),
        ) or []
    except Exception as exc:  # noqa: BLE001 - DB may not be migrated yet
        logger.warning("Video job recovery skipped (DB unavailable): %s", exc)
        return {"jobs_recovered": 0, "job_ids": []}
    ids = [int(r["id"]) for r in active]
    if not ids:
        return {"jobs_recovered": 0, "job_ids": []}
    # mark failed-retryable FIRST, then reset the (now-failed) rows' counters
    store.mark_processing_jobs_interrupted()
    store.cleanup_interrupted_jobs_tmp(ids)
    worker = get_or_create_worker()
    for job_id in ids:
        worker._cleanup_job_dir(job_id)
    logger.info("Recovered %s interrupted video job(s) as retryable failures.", len(ids))
    return {"jobs_recovered": len(ids), "job_ids": ids}
