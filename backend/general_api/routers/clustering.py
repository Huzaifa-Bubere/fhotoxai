import logging
from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException
from typing import Optional
from fastapi.responses import FileResponse
import zipfile
import os
import uuid

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from auth_utils import assert_event_access, require_roles
from database import execute_query, execute_insert, execute_update
from config import BASE_DIR

logger = logging.getLogger("clustering_router")


def _cleanup_temp_file(path: str):
    """Delete a temp file after it has been served."""
    import time
    time.sleep(60)  # Give the response time to finish streaming
    try:
        if os.path.exists(path):
            os.remove(path)
            logging.getLogger("clustering_router").info(f"Cleaned up temp file: {path}")
    except Exception:
        pass

router = APIRouter(prefix="/clustering", tags=["clustering"])


def _normalize_photo_path(path: Optional[str]) -> Optional[str]:
    if not path:
        return path
    return path.replace("\\", "/")


def _get_cluster_event_id(cluster_id: int) -> int:
    rows = execute_query("SELECT event_id FROM people_clusters WHERE id = %s", (cluster_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return rows[0]["event_id"]


def _create_training_job(event_id: str, admin_id: str) -> int:
    from datetime import datetime

    return execute_insert(
        "INSERT INTO training_jobs (event_id, admin_id, status, progress, started_at) VALUES (%s, %s, %s, %s, %s)",
        (event_id, admin_id, "queued", 0, datetime.now()),
    )


def _mark_training_job_failed(training_job_id: int, error_message: str) -> None:
    try:
        execute_update(
            "UPDATE training_jobs SET status = 'failed', error_message = %s WHERE id = %s",
            (error_message[:500], training_job_id),
        )
    except Exception as update_error:
        logger.error(f"Failed to mark training job {training_job_id} as failed: {update_error}")


def _is_missing_aws_credentials_error(error: Exception) -> bool:
    try:
        from botocore.exceptions import NoCredentialsError, PartialCredentialsError

        if isinstance(error, (NoCredentialsError, PartialCredentialsError)):
            return True
    except Exception:
        pass

    error_text = str(error)
    return (
        "Unable to locate credentials" in error_text
        or "Partial credentials found" in error_text
    )


def _trigger_aws_api_gateway(event_id: str) -> None:
    import json
    import urllib.request

    api_gateway_url = os.getenv(
        "AWS_API_GATEWAY_URL",
        "https://057befrti5.execute-api.ap-south-1.amazonaws.com/start-ai",
    )

    req = urllib.request.Request(api_gateway_url, method="POST")
    req.add_header("Content-Type", "application/json")
    payload = json.dumps({"event_id": event_id}).encode("utf-8")

    try:
        with urllib.request.urlopen(req, data=payload) as response:
            resp_body = response.read()
            logger.info(f"Triggered AWS API Gateway successfully: {resp_body}")
    except Exception as e:
        logger.error(f"Failed to trigger AWS API Gateway: {e}")
        # Non-fatal error; EC2 might already be running.


def _queue_job_via_sqs(training_job_id: int, event_id: str, admin_id: str) -> None:
    import boto3
    import json

    region = os.getenv("AWS_REGION", "ap-south-1")
    queue_url = os.getenv(
        "AWS_SQS_QUEUE_URL",
        "https://sqs.ap-south-1.amazonaws.com/104363824017/photo-clustering",
    )

    sqs_client = boto3.client(
        "sqs",
        region_name=region,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )

    sqs_client.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(
            {
                "training_job_id": training_job_id,
                "event_id": event_id,
                "admin_id": admin_id,
            }
        ),
    )
    logger.info(f"Successfully published SQS message for job {training_job_id} on event {event_id}")


def _queue_job_via_local_ai_api(training_job_id: int, event_id: str, admin_id: str) -> None:
    import urllib.parse
    import urllib.request

    ai_processing_url = os.getenv(
        "AI_PROCESSING_API_URL",
        "http://127.0.0.1:5001/processing/start",
    )
    payload = urllib.parse.urlencode(
        {
            "training_job_id": training_job_id,
            "event_id": event_id,
            "admin_id": admin_id,
        }
    ).encode("utf-8")

    req = urllib.request.Request(ai_processing_url, data=payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    with urllib.request.urlopen(req, timeout=10) as response:
        resp_body = response.read()
        logger.info(f"Queued training job {training_job_id} via local AI API: {resp_body}")

@router.get("/metrics")
async def get_metrics(
    event_id: Optional[int] = None,
    current_user: dict = Depends(require_roles("organizer")),
):
    """Get training metrics and status"""
    if event_id is not None:
        assert_event_access(current_user, event_id, {"organizer"})
    metrics = {
        "total_photos": 0,
        "total_faces": 0,
        "unique_identities": 0,
        "attendee_count": 0,
        "training_in_progress": False,
        "completion_status": "0%"
    }

    if event_id:
        job = execute_query("SELECT * FROM training_jobs WHERE event_id = %s ORDER BY started_at DESC LIMIT 1", (event_id,))
        if job:
            metrics["training_in_progress"] = job[0]['status'] in ['queued', 'processing', 'in_progress']
            metrics["completion_status"] = f"{job[0]['progress']}%"

        photo_count = execute_query("SELECT COUNT(*) as count FROM photos WHERE event_id = %s", (event_id,))
        metrics["total_photos"] = photo_count[0]['count'] if photo_count else 0

        face_count = execute_query("SELECT COUNT(*) as count FROM faces f JOIN photos p ON f.photo_id = p.id WHERE p.event_id = %s", (event_id,))
        metrics["total_faces"] = face_count[0]['count'] if face_count else 0

        cluster_count = execute_query("SELECT COUNT(*) as count FROM people_clusters WHERE event_id = %s", (event_id,))
        metrics["unique_identities"] = cluster_count[0]['count'] if cluster_count else 0
        
        attendee_count = execute_query("SELECT COUNT(*) as count FROM attendees WHERE event_id = %s", (event_id,))
        metrics["attendee_count"] = attendee_count[0]['count'] if attendee_count else 0

    return metrics

@router.get("/active")
async def get_active_jobs(
    current_user: dict = Depends(require_roles("organizer")),
):
    """Get list of active training jobs"""
    query = "SELECT * FROM training_jobs WHERE status IN ('queued', 'processing', 'in_progress')"
    return execute_query(query)

@router.post("/start")
async def start_training(
    event_id: str = Form(...),
    admin_id: str = Form("1"),
    current_user: dict = Depends(require_roles("organizer")),
):
    """Start face clustering via AWS queueing or the local AI API."""
    training_job_id = None
    try:
        assert_event_access(current_user, int(event_id), {"organizer"})
        queue_mode = os.getenv("CLUSTERING_QUEUE_MODE", "auto").strip().lower()

        training_job_id = _create_training_job(event_id, str(current_user["id"]))

        if queue_mode != "local":
            _trigger_aws_api_gateway(event_id)
            try:
                _queue_job_via_sqs(training_job_id, event_id, str(current_user["id"]))
            except Exception as e:
                if queue_mode == "auto" and _is_missing_aws_credentials_error(e):
                    logger.warning(
                        "AWS credentials are not configured; falling back to local AI processing for job %s",
                        training_job_id,
                    )
                else:
                    logger.error(f"Failed to publish to SQS: {e}")
                    raise HTTPException(status_code=500, detail="Failed to queue processing job")
            else:
                return {
                    "status": "success",
                    "message": "Clustering job queued successfully",
                    "job_id": training_job_id,
                    "queue_mode": "aws",
                }

        else:
            logger.info(
                "CLUSTERING_QUEUE_MODE=local; queueing training job %s via local AI API",
                training_job_id,
            )

        try:
            _queue_job_via_local_ai_api(training_job_id, event_id, str(current_user["id"]))
        except Exception as e:
            logger.error(f"Failed to queue job via local AI API: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to queue processing job locally. Start the AI API on port 5001 or configure AWS credentials.",
            )

        return {
            "status": "success",
            "message": "Clustering job queued successfully",
            "job_id": training_job_id,
            "queue_mode": "local",
        }
    except HTTPException as e:
        if training_job_id is not None:
            _mark_training_job_failed(training_job_id, str(e.detail))
        logger.error(f"Start training failed: {e.detail}")
        raise
    except Exception as e:
        if training_job_id is not None:
            _mark_training_job_failed(training_job_id, str(e))
        logger.error(f"Start training failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to start clustering job")

@router.get("/clusters/{cluster_id}/download-zip")
async def download_cluster_zip(
    cluster_id: int,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_roles("organizer")),
):
    """Download all photos in a cluster as ZIP"""
    event_id = _get_cluster_event_id(cluster_id)
    assert_event_access(current_user, event_id, {"organizer"})
    zip_path = os.path.join(BASE_DIR, "downloads", f"cluster_{cluster_id}_{uuid.uuid4()}.zip")
    os.makedirs(os.path.dirname(zip_path), exist_ok=True)
    
    query = "SELECT p.file_path FROM photos p JOIN faces f ON p.id = f.photo_id WHERE f.person_cluster_id = %s"
    photos = execute_query(query, (cluster_id,))
    
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for photo in photos:
            full_path = os.path.join(BASE_DIR, photo['file_path'])
            if os.path.exists(full_path):
                zipf.write(full_path, os.path.basename(full_path))
    
    # Schedule temp file cleanup after response is sent
    background_tasks.add_task(_cleanup_temp_file, zip_path)
    return FileResponse(zip_path, filename=f"cluster_{cluster_id}.zip")

@router.get("/clusters/{event_id}")
async def get_clusters(
    event_id: int,
    current_user: dict = Depends(require_roles("organizer")),
):
    """Get all face clusters for an event"""
    assert_event_access(current_user, event_id, {"organizer"})
    query = """
    SELECT 
        pc.*, 
        (SELECT COUNT(*) FROM faces WHERE person_cluster_id = pc.id) as face_count,
        p.file_path as thumbnail_path,
        p.storage_type as thumbnail_storage_type,
        f.x, f.y, f.width, f.height
    FROM people_clusters pc
    LEFT JOIN photos p ON pc.thumbnail_photo_id = p.id
    LEFT JOIN faces f ON f.photo_id = pc.thumbnail_photo_id AND f.person_cluster_id = pc.id
    WHERE pc.event_id = %s
    """
    results = execute_query(query, (event_id,))
    
    clusters = []
    if results:
        for row in results:
            cluster = {
                "id": row['id'],
                "name": row['cluster_name'],
                "total_faces": row['face_count'],
                "sample_faces": []
            }
            
            if row['thumbnail_path']:
                x, y, w, h = row['x'], row['y'], row['width'], row['height']
                if x is None: x, y, w, h = 0, 0, 0, 0
                
                cluster['sample_faces'].append({
                    "photo_url": _normalize_photo_path(row['thumbnail_path']),
                    "storage_type": row.get('thumbnail_storage_type') or 'local',
                    "bbox": [x, y, w, h]
                })
            
            clusters.append(cluster)
            
    return {"clusters": clusters}

@router.get("/events/{event_id}/faces")
async def get_event_faces(
    event_id: int,
    current_user: dict = Depends(require_roles("organizer")),
):
    """Get every detected face for an event without grouping by identity."""
    assert_event_access(current_user, event_id, {"organizer"})

    rows = execute_query(
        """
        SELECT
            f.id,
            f.photo_id,
            f.person_cluster_id AS cluster_id,
            pc.cluster_name,
            f.x,
            f.y,
            f.width,
            f.height,
            f.confidence,
            f.quality_score,
            p.file_path,
            p.storage_type
        FROM faces f
        JOIN photos p ON f.photo_id = p.id
        LEFT JOIN people_clusters pc ON pc.id = f.person_cluster_id
        WHERE p.event_id = %s
        ORDER BY f.confidence DESC, f.quality_score DESC, f.id ASC
        """,
        (event_id,),
    )

    faces = []
    for row in rows:
        faces.append({
            "id": row["id"],
            "photo_id": row["photo_id"],
            "cluster_id": row.get("cluster_id"),
            "cluster_name": row.get("cluster_name") or f"Face_{row['id']}",
            "photo_url": _normalize_photo_path(row["file_path"]),
            "storage_type": row.get("storage_type") or "local",
            "bbox": [row["x"] or 0, row["y"] or 0, row["width"] or 0, row["height"] or 0],
            "confidence": row["confidence"] or 0.0,
            "quality_score": row["quality_score"] or 0.0,
        })

    return {
        "faces": faces,
        "total": len(faces),
    }

@router.get("/clusters/{cluster_id}/faces")
async def get_cluster_faces(
    cluster_id: int,
    limit: int = 100,
    offset: int = 0,
    current_user: dict = Depends(require_roles("organizer")),
):
    """Get faces belonging to a specific cluster with full photo details"""
    event_id = _get_cluster_event_id(cluster_id)
    assert_event_access(current_user, event_id, {"organizer"})
    cluster_row = execute_query(
        """
        SELECT pc.id, pc.cluster_name, pc.event_id, pc.thumbnail_photo_id, e.name as event_name 
        FROM people_clusters pc
        LEFT JOIN events e ON pc.event_id = e.id
        WHERE pc.id = %s
        """,
        (cluster_id,)
    )
    if not cluster_row:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    count_result = execute_query(
        "SELECT COUNT(*) as total FROM faces WHERE person_cluster_id = %s",
        (cluster_id,)
    )
    total = count_result[0]['total'] if count_result else 0
    
    query = """
    SELECT f.id, f.photo_id, f.x, f.y, f.width, f.height, f.confidence, f.quality_score,
           p.file_path, p.storage_type
    FROM faces f 
    JOIN photos p ON f.photo_id = p.id 
    WHERE f.person_cluster_id = %s 
    ORDER BY f.confidence DESC
    LIMIT %s OFFSET %s
    """
    rows = execute_query(query, (cluster_id, limit, offset))
    
    faces = []
    for row in rows:
        faces.append({
            "id": row['id'],
            "photo_id": row['photo_id'],
            "photo_url": _normalize_photo_path(row['file_path']),
            "storage_type": row.get('storage_type') or 'local',
            "bbox": [row['x'] or 0, row['y'] or 0, row['width'] or 0, row['height'] or 0],
            "confidence": row['confidence'] or 0.0,
            "quality_score": row['quality_score'] or 0.0
        })
    
    return {
        "faces": faces,
        "cluster": {
            "id": cluster_row[0]['id'],
            "cluster_name": cluster_row[0]['cluster_name'],
            "event_id": cluster_row[0]['event_id'],
            "event_name": cluster_row[0]['event_name']
        },
        "total": total
    }

@router.post("/clusters/rename")
async def rename_cluster(
    cluster_id: int = Form(...),
    name: str = Form(...),
    current_user: dict = Depends(require_roles("organizer")),
):
    """Update cluster name"""
    event_id = _get_cluster_event_id(cluster_id)
    assert_event_access(current_user, event_id, {"organizer"})
    execute_update("UPDATE people_clusters SET cluster_name = %s WHERE id = %s", (name, cluster_id))
    return {"status": "success", "message": "Cluster renamed"}
