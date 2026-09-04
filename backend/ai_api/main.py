import os
import cv2
import logging
import numpy as np
from datetime import datetime
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional
import uvicorn

# Disable albumentations version check
os.environ['ALBUMENTATIONS_DISABLE_VERSION_CHECK'] = '1'

from ai_api.config import API_TITLE, API_VERSION, BASE_DIR, UPLOADS_DIR, FRONTEND_URL, CLUSTERING_THRESHOLD
from ai_api.database import execute_query, execute_insert, execute_update
from ai_api.services.face_service import face_service
from ai_api.services.training_service import training_service
from ai_api.services.sqs_worker import sqs_worker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger("ai_api")

app = FastAPI(
    title=f"{API_TITLE} - AI Processing",
    version=API_VERSION,
    description="AI Processing API for Face Detection, Clustering & Training (Port 5001)"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# BACKGROUND WORKER
# ==========================================

def _sqs_worker_enabled() -> bool:
    queue_mode = os.getenv("CLUSTERING_QUEUE_MODE", "auto").strip().lower()
    if queue_mode == "local":
        return False

    worker_enabled = os.getenv("AI_API_ENABLE_SQS_WORKER", "true").strip().lower()
    return worker_enabled not in {"0", "false", "no", "off"}


@app.on_event("startup")
async def startup_event():
    if _sqs_worker_enabled():
        logger.info("Initializing background SQS worker thread...")
        sqs_worker.start()
    else:
        logger.info("Skipping background SQS worker startup for local clustering mode.")


@app.on_event("shutdown")
async def shutdown_event():
    if _sqs_worker_enabled():
        logger.info("Shutting down SQS worker...")
        sqs_worker.stop()


# ==========================================
# TRAINING / PROCESSING ENDPOINTS
# ==========================================

@app.post("/processing/start")
async def start_training(
    background_tasks: BackgroundTasks,
    event_id: str = Form(...),
    admin_id: str = Form(...),
    training_job_id: Optional[int] = Form(None)
):
    """Start the face detection and clustering training process"""

    logger.info(f"Training started for event {event_id} by admin {admin_id}")

    if training_job_id is None:
        training_job_id = execute_insert(
            "INSERT INTO training_jobs (event_id, admin_id, status, progress, started_at) VALUES (%s, %s, %s, %s, %s)",
            (int(event_id), int(admin_id), 'queued', 0, datetime.now())
        )
    else:
        existing_job = execute_query(
            "SELECT id FROM training_jobs WHERE id = %s",
            (int(training_job_id),)
        )
        if not existing_job:
            raise HTTPException(status_code=404, detail="Training job not found")

        execute_update(
            "UPDATE training_jobs SET status = 'queued', progress = 0, error_message = NULL, completed_at = NULL WHERE id = %s",
            (int(training_job_id),)
        )

    background_tasks.add_task(
        training_service.process_training_job,
        int(training_job_id),
        int(event_id)
    )

    return {
        "status": "success",
        "message": "Training job queued",
        "job_id": int(training_job_id)
    }


# ==========================================
# FACE REGISTRATION ENDPOINT
# ==========================================

@app.post("/processing/register-face")
async def register_face(
    event_id: int = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    selfie: UploadFile = File(...)
):
    """Register an attendee with biometric data"""

    try:
        contents = await selfie.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        if not face_service.load_models():
            raise HTTPException(status_code=500, detail="Models failed to load")

        face_record = face_service.get_embedding(img)

        if face_record is None:
            raise HTTPException(status_code=400, detail="No face detected")

        embedding = face_record['embedding']
        embedding = embedding / (np.linalg.norm(embedding) + 1e-10)

        query = """
        INSERT INTO attendees
        (event_id, name, email, phone, face_embedding, consent)
        VALUES (%s, %s, %s, %s, %s, TRUE)
        """

        attendee_id = execute_insert(
            query,
            (event_id, name, email, phone, embedding)
        )

        # Send Registration Email
        try:
            import subprocess

            event_res = execute_query(
                "SELECT name FROM events WHERE id = %s",
                (event_id,)
            )

            event_name = event_res[0]['name'] if event_res else "Event"

            login_url = f"{FRONTEND_URL}/attendee/login?email={email}&eventId={event_id}"

            script_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "attendee_registration_email.js"
            )

            subprocess.Popen([
                "node",
                script_path,
                email,
                name,
                event_name,
                login_url
            ], cwd=BASE_DIR)

        except Exception as e:
            logger.error(f"Failed to trigger registration email: {e}")

        return {
            "status": "success",
            "id": attendee_id,
            "message": "Registered successfully"
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Attendee registration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# FACE RECOGNITION ENDPOINT
# ==========================================

@app.post("/processing/recognize")
async def recognize_face(file: UploadFile = File(...)):

    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if not face_service.load_models():
            raise HTTPException(status_code=500, detail="Models failed to load")

        face_record = face_service.get_embedding(img)

        if face_record is None:
            return {
                "status": "error",
                "message": "No face detected in photo"
            }

        embedding = face_record['embedding']

        clusters = execute_query(
            """
            SELECT id, cluster_name, centroid,
                   centroid <=> %s AS distance
            FROM people_clusters
            WHERE centroid IS NOT NULL
            ORDER BY distance ASC
            LIMIT 1
            """,
            (embedding,)
        )

        if clusters:
            cosine_similarity = 1.0 - float(clusters[0]['distance'])
            if cosine_similarity < CLUSTERING_THRESHOLD:
                return {
                    "status": "success",
                    "match": None,
                    "message": "No matching identities found"
                }

            best_match = clusters[0]

            attendee_db = execute_query(
                "SELECT * FROM attendees WHERE cluster_id = %s",
                (best_match['id'],)
            )

            attendee = dict(attendee_db[0]) if attendee_db else None

            if attendee:
                attendee.pop('face_embedding', None)
                attendee.pop('face_embedding_path', None)

            return {
                "status": "success",
                "match": {
                    "cluster_id": best_match['id'],
                    "cluster_name": best_match['cluster_name'],
                    "distance": float(best_match['distance']),
                    "similarity": cosine_similarity,
                    "attendee": attendee
                }
            }

        return {
            "status": "success",
            "match": None,
            "message": "No matching identities found"
        }

    except Exception as e:
        logger.error(f"Recognition error: {e}")

        return {
            "status": "error",
            "message": str(e)
        }


# ==========================================
# ROOT / HEALTH CHECK
# ==========================================

@app.get("/")
async def root():
    return {
        "message": "AI Processing API is running",
        "version": API_VERSION,
        "port": 5001
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):

    logger.error(f"Global exception: {str(exc)}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal server error",
            "detail": str(exc)
        }
    )


# ==========================================
# STATIC FILES
# ==========================================

class CORSStaticFiles(StaticFiles):

    async def get_response(self, path: str, scope):

        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"

        return response


app.mount(
    "/uploads",
    CORSStaticFiles(directory=UPLOADS_DIR, html=True),
    name="uploads"
)


# ==========================================
# LOCAL RUN (NOT USED IN DOCKER)
# ==========================================

if __name__ == "__main__":
    uvicorn.run("ai_api.main:app", host="0.0.0.0", port=5001)
