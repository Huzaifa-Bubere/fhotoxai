import os
import cv2
import logging
import numpy as np
from collections import Counter
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Sequence, Tuple

from ai_api.database import execute_query, execute_insert, execute_update, execute_many
from ai_api.services.face_service import (
    face_service,
    DET_CONFIDENCE_MIN as DEFAULT_DET_CONFIDENCE_MIN,
    FACE_SIZE_MIN_PX as DEFAULT_FACE_SIZE_MIN_PX,
    BLUR_VARIANCE_MIN as DEFAULT_BLUR_VARIANCE_MIN,
    FACE_AREA_RATIO_MIN as DEFAULT_FACE_AREA_RATIO_MIN,
)
from ai_api.services.clustering_service import clustering_service, ClusteringConfigV2
from ai_api.services.notification_service import notification_service
from ai_api.config import BASE_DIR, EMBEDDING_DIM


CLUSTERING_THRESHOLD                = float(os.getenv("CLUSTERING_THRESHOLD",            "0.50"))
MERGE_THRESHOLD                     = float(os.getenv("MERGE_THRESHOLD",                 "0.50"))
DBSCAN_EPS                          = float(os.getenv("DBSCAN_EPS",                      "0.50"))
DBSCAN_MIN_SAMPLES                  = int(os.getenv("DBSCAN_MIN_SAMPLES",                "2"))
NOISE_ASSIGNMENT_THRESHOLD          = float(os.getenv("NOISE_ASSIGNMENT_THRESHOLD",      "0.55"))
KEEP_SINGLETON_CLUSTERS             = os.getenv("KEEP_SINGLETON_CLUSTERS",               "true").strip().lower() in {"1", "true", "yes", "on"}
ATTENDEE_MATCH_THRESHOLD            = float(os.getenv("ATTENDEE_MATCH_THRESHOLD",        "0.40"))
MAX_EMBEDDINGS_IN_MEMORY            = int(os.getenv("MAX_EMBEDDINGS_IN_MEMORY",          "50000"))
MIN_FACE_CONFIDENCE                 = float(os.getenv("MIN_FACE_CONFIDENCE",             str(DEFAULT_DET_CONFIDENCE_MIN)))
MIN_FACE_SIZE_PX                    = int(os.getenv("MIN_FACE_SIZE_PX",                  str(DEFAULT_FACE_SIZE_MIN_PX)))
MIN_FACE_QUALITY                    = float(os.getenv("MIN_FACE_QUALITY",                "0.18"))
BLUR_VARIANCE_THRESHOLD             = float(os.getenv("BLUR_VARIANCE_THRESHOLD",         str(DEFAULT_BLUR_VARIANCE_MIN)))
MIN_FACE_AREA_RATIO                 = float(os.getenv("MIN_FACE_AREA_RATIO",             str(DEFAULT_FACE_AREA_RATIO_MIN)))
DUPLICATE_FACE_SIMILARITY_THRESHOLD = float(os.getenv("DUPLICATE_FACE_SIMILARITY_THRESHOLD", "0.95"))
MAX_FACES_PER_IMAGE                 = int(os.getenv("MAX_FACES_PER_IMAGE",              "32"))

VALID_EMBEDDING_DIMS = {128, 512}
if EMBEDDING_DIM > 0:
    VALID_EMBEDDING_DIMS.add(int(EMBEDDING_DIM))

logger = logging.getLogger("training_service")



def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_bbox(
    face_data: Dict[str, Any], image_shape: Sequence[int]
) -> Optional[List[int]]:
    bbox = face_data.get("bbox")
    if bbox is None or len(bbox) != 4:
        return None
    try:
        x, y, w, h = [int(round(float(v))) for v in bbox]
    except (TypeError, ValueError):
        return None
    if w <= 0 or h <= 0:
        return None
    image_h, image_w = image_shape[:2]
    x1 = max(0, x);           y1 = max(0, y)
    x2 = min(image_w, x + w); y2 = min(image_h, y + h)
    if x2 <= x1 or y2 <= y1:
        return None
    return [x1, y1, x2 - x1, y2 - y1]


def _extract_face_crop(
    face_data: Dict[str, Any], image: np.ndarray
) -> Tuple[Optional[np.ndarray], Optional[List[int]]]:
    bbox = _coerce_bbox(face_data, image.shape)
    if bbox is None:
        return None, None
    x, y, w, h = bbox
    crop = image[y:y + h, x:x + w]
    return (None, None) if crop.size == 0 else (crop, bbox)


def compute_blur_variance(face_crop: np.ndarray) -> float:
    if face_crop is None or face_crop.size == 0:
        return 0.0
    if face_crop.ndim == 3 and face_crop.shape[2] >= 3:
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    elif face_crop.ndim == 2:
        gray = face_crop
    else:
        return 0.0
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def validate_embedding(embedding: Any) -> Optional[np.ndarray]:
    if embedding is None:
        return None
    try:
        arr = np.asarray(embedding, dtype=np.float32).reshape(-1)
    except (TypeError, ValueError):
        return None
    if arr.size == 0 or arr.size not in VALID_EMBEDDING_DIMS:
        return None
    if not np.all(np.isfinite(arr)):
        return None
    norm = float(np.linalg.norm(arr))
    return None if norm <= 1e-10 else arr / norm


# ---------------------------------------------------------------------------
# Face preprocessing pipeline
# ---------------------------------------------------------------------------

def _prepare_face_for_clustering(
    face_data: Dict[str, Any], image: np.ndarray
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Second-pass quality gate that runs after face_service_v2's internal gate.
    Returns (prepared_face, None) on pass or (None, reason) on reject.
    """
    confidence = _safe_float(face_data.get("confidence"), 0.0)
    if confidence < MIN_FACE_CONFIDENCE:
        return None, "low_confidence"

    face_crop, bbox = _extract_face_crop(face_data, image)
    if face_crop is None or bbox is None:
        return None, "invalid_bbox"

    _, _, width, height = bbox
    if width < MIN_FACE_SIZE_PX or height < MIN_FACE_SIZE_PX:
        return None, "small_face"

    image_area = max(image.shape[0] * image.shape[1], 1)
    face_area_ratio = float(width * height) / float(image_area)
    if face_area_ratio < MIN_FACE_AREA_RATIO:
        return None, "small_relative_face"

    quality = _safe_float(face_data.get("quality", face_data.get("quality_score")), 0.0)
    if quality < MIN_FACE_QUALITY:
        return None, "low_quality"

    blur_variance = compute_blur_variance(face_crop)
    if blur_variance < BLUR_VARIANCE_THRESHOLD:
        return None, "blurry"

    normalized_embedding = validate_embedding(face_data.get("embedding"))
    if normalized_embedding is None:
        return None, "invalid_embedding"

    return {
        "embedding":     normalized_embedding.astype(np.float32),
        "bbox":          bbox,
        "confidence":    confidence,
        "quality":       quality,
        "blur_variance": blur_variance,
        "area":          width * height,
        "area_ratio":    face_area_ratio,
    }, None


def filter_faces(
    detected_faces: Sequence[Dict[str, Any]], image: np.ndarray
) -> Tuple[List[Dict[str, Any]], Counter]:
    valid: List[Dict[str, Any]] = []
    rejected: Counter = Counter()
    for face in detected_faces:
        prepared, reason = _prepare_face_for_clustering(face, image)
        if prepared is None:
            rejected[reason or "unknown"] += 1
        else:
            valid.append(prepared)
    return valid, rejected


def remove_duplicate_faces(
    face_list: Sequence[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    if len(face_list) <= 1:
        return list(face_list)
    kept: List[Dict[str, Any]] = []
    for face in sorted(
        face_list,
        key=lambda f: (
            _safe_float(f.get("quality")),
            f.get("area", 0),
            _safe_float(f.get("confidence")),
        ),
        reverse=True,
    ):
        emb = face["embedding"]
        if not any(
            float(np.dot(emb, k["embedding"])) > DUPLICATE_FACE_SIMILARITY_THRESHOLD
            for k in kept
        ):
            kept.append(face)
    return kept


def limit_faces(
    face_list: Sequence[Dict[str, Any]], max_faces: int = MAX_FACES_PER_IMAGE
) -> List[Dict[str, Any]]:
    ranked = sorted(
        face_list,
        key=lambda f: (
            f.get("area", 0),
            _safe_float(f.get("quality")),
            _safe_float(f.get("confidence")),
        ),
        reverse=True,
    )
    return ranked if max_faces <= 0 else ranked[:max_faces]


def preprocess_faces_for_clustering(
    detected_faces: Sequence[Dict[str, Any]],
    image: np.ndarray,
    max_faces: int = MAX_FACES_PER_IMAGE,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    filtered, rejected = filter_faces(detected_faces, image)
    deduped = remove_duplicate_faces(filtered)
    limited = limit_faces(deduped, max_faces=max_faces)
    return limited, {
        "detected":           len(detected_faces),
        "after_filtering":    len(filtered),
        "duplicates_removed": len(filtered) - len(deduped),
        "limited_removed":    len(deduped) - len(limited),
        "sent_to_clustering": len(limited),
        "rejection_counts":   dict(rejected),
    }


# ---------------------------------------------------------------------------
# TrainingService
# ---------------------------------------------------------------------------

class TrainingService:
    def __init__(self):
        self.metrics = {
            "total_photos":            0,
            "total_faces":             0,
            "unique_identities":       0,
            "completion_status":       "0%",
            "last_training_timestamp": None,
            "training_in_progress":    False,
        }

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def _cleanup_previous_training_data(self, event_id: int):
        execute_update(
            "DELETE FROM faces WHERE photo_id IN (SELECT id FROM photos WHERE event_id = %s)",
            (event_id,),
        )
        execute_update("UPDATE attendees SET cluster_id = NULL WHERE event_id = %s", (event_id,))
        execute_update("DELETE FROM people_clusters WHERE event_id = %s", (event_id,))

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _persist_clusters_and_faces(
        self,
        event_id:     int,
        labels:       np.ndarray,
        face_records: List[Dict],
        centroids:    Dict[int, np.ndarray],
    ) -> Dict[int, int]:
        from ai_api.services.clustering_service import ClusteringServiceV2

        valid_indices = [i for i, label in enumerate(labels) if int(label) >= 0]
        if not valid_indices:
            logger.info("No valid cluster labels to persist for event %s", event_id)
            return {}

        # Best-quality thumbnail per cluster
        cluster_thumbnails: Dict[int, Dict] = {}
        for i in valid_indices:
            label = labels[i]
            lbl    = int(label)
            record = face_records[i]
            if lbl not in cluster_thumbnails or record["quality"] > cluster_thumbnails[lbl]["quality"]:
                cluster_thumbnails[lbl] = record

        cluster_map: Dict[int, int] = {}
        for label in np.unique(labels[valid_indices]):
            lbl        = int(label)
            centroid   = centroids[lbl]
            face_count = int(np.sum(labels == label))

            cluster_id = execute_insert(
                "INSERT INTO people_clusters "
                "(event_id, cluster_name, thumbnail_photo_id, centroid, face_count) "
                "VALUES (%s, %s, %s, %s, %s)",
                (
                    event_id,
                    f"Person_{lbl + 1}",
                    cluster_thumbnails[lbl]["photo_id"],
                    centroid,
                    face_count,
                ),
            )
            cluster_map[lbl] = cluster_id

        # Bulk-insert faces with real confidence scores (fixes "always 0%" bug)
        face_insert_params = []
        for i in valid_indices:
            label = labels[i]
            lbl      = int(label)
            record   = face_records[i]
            x, y, w, h = record["bbox"]
            centroid = centroids.get(lbl)

            # Confidence = cosine_similarity * 100  (was always 0 before)
            if centroid is not None:
                confidence_score = ClusteringServiceV2.compute_confidence(
                    record["embedding"], centroid
                )
            else:
                confidence_score = _safe_float(record.get("confidence"), 0.0) * 100.0

            face_insert_params.append((
                record["photo_id"],
                cluster_map[lbl],
                record["embedding"],
                x, y, w, h,
                confidence_score,
                record["quality"],
            ))

        if face_insert_params:
            execute_many(
                "INSERT INTO faces "
                "(photo_id, person_cluster_id, embedding, x, y, width, height, confidence, quality_score) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                face_insert_params,
            )
            logger.info(f"Bulk-inserted {len(face_insert_params)} face records")

        return cluster_map

    # ------------------------------------------------------------------
    # Main pipeline
    # ------------------------------------------------------------------

    def process_training_job(self, training_job_id: int, event_id: int):
        """
        Full pipeline:
          1.  Cleanup old clustering data
          2.  Load face models (face_service_v2 with built-in quality gate)
          3.  Fetch photo list from DB
          4a. Parallel I/O — load images from S3 or local disk
          4b. Sequential face detection + second-pass quality filter
          5.  Cluster embeddings
          6.  Persist clusters & faces with real confidence scores
          7.  Match registered attendees to clusters
          8.  Notify organizer + attendees
        """
        logger.info(f"Starting training job {training_job_id} for event {event_id}")
        self.metrics["training_in_progress"] = True

        try:
            execute_update("UPDATE events SET status = 'processing' WHERE id = %s", (event_id,))

            # 1. Cleanup
            self._cleanup_previous_training_data(event_id)

            # 2. Load models
            if not face_service.load_models():
                raise Exception("Failed to load face models")

            # 2b. Load reference faces (optional — improves accuracy if available)
            logger.info("Reference-face seeding removed; running unsupervised clustering")
            if False:
                logger.info("No reference faces available — running unsupervised clustering")

            # 3. Fetch photos
            photos = execute_query(
                "SELECT id, file_path, storage_type FROM photos WHERE event_id = %s",
                (event_id,),
            )
            if not photos:
                logger.info("No photos to process.")
                execute_update(
                    "UPDATE training_jobs SET status = 'completed', progress = 100 WHERE id = %s",
                    (training_job_id,),
                )
                execute_update("UPDATE events SET status = 'completed' WHERE id = %s", (event_id,))
                return

            import boto3
            s3_client = boto3.client(
                "s3",
                region_name=os.getenv("AWS_REGION", "ap-south-1"),
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            )
            bucket_name = os.getenv("AWS_S3_BUCKET_NAME", "photo-cluster-frontend")

            def _load_photo(photo):
                storage_type = photo.get("storage_type", "local")
                img = None
                if storage_type == "s3":
                    try:
                        response = s3_client.get_object(Bucket=bucket_name, Key=photo["file_path"])
                        arr = np.frombuffer(response["Body"].read(), np.uint8)
                        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                    except Exception as e:
                        logger.error(f"S3 load failed for {photo['file_path']}: {e}")
                else:
                    path = os.path.join(BASE_DIR, photo["file_path"])
                    if os.path.exists(path):
                        img = cv2.imread(path)
                return photo["id"], img

            # 4a. Parallel I/O
            loaded_photos: List[Tuple[int, np.ndarray]] = []
            with ThreadPoolExecutor(max_workers=min(8, len(photos))) as executor:
                futures = {executor.submit(_load_photo, p): p for p in photos}
                for future in as_completed(futures):
                    photo_id, img = future.result()
                    if img is not None:
                        loaded_photos.append((photo_id, img))

            logger.info(f"Loaded {len(loaded_photos)}/{len(photos)} photos from storage")

            # 4b. Sequential detection + quality filter
            all_embeddings: List[np.ndarray] = []
            face_records:   List[Dict]        = []
            total_detected = total_filtered = total_deduped = total_limited = 0
            rejection_summary: Counter = Counter()

            for idx, (photo_id, img) in enumerate(loaded_photos):
                detected_faces = face_service.get_all_faces(img)
                prepared_faces, stats = preprocess_faces_for_clustering(detected_faces, img)

                total_detected  += stats["detected"]
                total_filtered  += stats["after_filtering"]
                total_deduped   += stats["duplicates_removed"]
                total_limited   += stats["limited_removed"]
                rejection_summary.update(stats["rejection_counts"])

                logger.info(
                    "Photo %s: detected=%d filtered=%d deduped=%d limited=%d "
                    "sent=%d rejected=%s",
                    photo_id,
                    stats["detected"], stats["after_filtering"],
                    stats["duplicates_removed"], stats["limited_removed"],
                    stats["sent_to_clustering"], stats["rejection_counts"],
                )

                for face in prepared_faces:
                    all_embeddings.append(face["embedding"])
                    face_records.append({
                        "photo_id":   photo_id,
                        "embedding":  face["embedding"],
                        "bbox":       face["bbox"],
                        "confidence": face["confidence"],
                        "quality":    face["quality"],
                    })

                progress = int((idx + 1) / len(loaded_photos) * 70)
                execute_update(
                    "UPDATE training_jobs SET progress = %s WHERE id = %s",
                    (progress, training_job_id),
                )

                if len(all_embeddings) > MAX_EMBEDDINGS_IN_MEMORY:
                    raise Exception(
                        f"Too many faces ({len(all_embeddings)} > {MAX_EMBEDDINGS_IN_MEMORY}). "
                        "Raise MAX_EMBEDDINGS_IN_MEMORY or split the event."
                    )

            del loaded_photos  # free image RAM before O(n²) clustering

            logger.info(
                "Detection complete: detected=%d filtered=%d deduped=%d limited=%d "
                "sent_to_clustering=%d rejection_summary=%s",
                total_detected, total_filtered, total_deduped, total_limited,
                len(all_embeddings), dict(rejection_summary),
            )

            self.metrics["total_photos"] = len(photos)
            self.metrics["total_faces"]  = len(face_records)

            # 5. Clustering
            unique_identities = 0
            cluster_map: Dict[int, int]        = {}
            centroids:   Dict[int, np.ndarray]  = {}

            if all_embeddings:
                embeddings_array = np.array(all_embeddings, dtype=np.float32)

                clustering_config = ClusteringConfigV2(
                    edge_similarity_threshold  = CLUSTERING_THRESHOLD,
                    merge_similarity_threshold = MERGE_THRESHOLD,
                    dbscan_eps                 = DBSCAN_EPS,
                    dbscan_min_samples         = DBSCAN_MIN_SAMPLES,
                    knn_k                      = 30,
                    cw_iterations              = 30,
                    keep_singletons            = KEEP_SINGLETON_CLUSTERS,
                    noise_assignment_threshold = NOISE_ASSIGNMENT_THRESHOLD,
                )
                logger.info(
                    "Clustering config: threshold=%.2f merge=%.2f dbscan_eps=%.2f "
                    "dbscan_min_samples=%d noise_assignment_threshold=%.2f keep_singletons=%s",
                    CLUSTERING_THRESHOLD,
                    MERGE_THRESHOLD,
                    DBSCAN_EPS,
                    DBSCAN_MIN_SAMPLES,
                    NOISE_ASSIGNMENT_THRESHOLD,
                    KEEP_SINGLETON_CLUSTERS,
                )

                labels, centroids = clustering_service.cluster_embeddings(
                    embeddings_array,
                    clustering_config,
                )

                valid_cluster_labels = labels[labels >= 0]
                unique_identities = len(np.unique(valid_cluster_labels)) if len(valid_cluster_labels) > 0 else 0
                logger.info(
                    f"Clustering complete: {unique_identities} identities "
                    f"from {len(all_embeddings)} faces"
                )
                self.metrics["unique_identities"] = unique_identities

                execute_update(
                    "UPDATE training_jobs SET progress = 85 WHERE id = %s",
                    (training_job_id,),
                )

                if unique_identities > 0 and centroids:
                    # 6. Persist
                    cluster_map = self._persist_clusters_and_faces(
                        event_id=event_id,
                        labels=labels,
                        face_records=face_records,
                        centroids=centroids,
                    )

                    # 7. Match attendees
                    self.match_attendees_to_clusters(event_id, cluster_map, centroids)
                else:
                    logger.info(
                        "Clustering produced no persistable identities for event %s; "
                        "skipping cluster persistence and attendee matching",
                        event_id,
                    )

            # Success
            execute_update(
                "UPDATE training_jobs SET status = 'completed', progress = 100, "
                "clusters_formed = %s, completed_at = %s WHERE id = %s",
                (unique_identities, datetime.now(), training_job_id),
            )
            execute_update("UPDATE events SET status = 'completed' WHERE id = %s", (event_id,))

            # 8. Notifications
            self._notify_organizer(event_id)
            self._notify_attendees(event_id)

        except Exception as e:
            logger.error(f"Training job {training_job_id} failed: {e}", exc_info=True)
            execute_update(
                "UPDATE training_jobs SET status = 'failed', error_message = %s WHERE id = %s",
                (str(e)[:500], training_job_id),
            )
        finally:
            self.metrics["training_in_progress"]    = False
            self.metrics["last_training_timestamp"] = datetime.now().isoformat()

    # ------------------------------------------------------------------
    # Attendee matching
    # ------------------------------------------------------------------

    def match_attendees_to_clusters(
        self,
        event_id:    int,
        cluster_map: Dict[int, int],
        centroids:   Dict[int, np.ndarray],
    ):
        if not centroids:
            return
        logger.info("Matching attendees to clusters...")

        attendees = execute_query(
            "SELECT id, face_embedding FROM attendees "
            "WHERE event_id = %s AND face_embedding IS NOT NULL",
            (event_id,),
        ) or []
        matched = 0
        for attendee in attendees:
            try:
                emb = np.array(attendee["face_embedding"], dtype=np.float32)
                emb = emb / (np.linalg.norm(emb) + 1e-10)

                best_label, best_sim = None, -1.0
                for label, centroid in centroids.items():
                    sim = float(np.dot(emb, centroid))
                    if sim > best_sim:
                        best_sim   = sim
                        best_label = label

                if best_label is not None and best_sim >= ATTENDEE_MATCH_THRESHOLD:
                    execute_update(
                        "UPDATE attendees SET cluster_id = %s WHERE id = %s",
                        (cluster_map[best_label], attendee["id"]),
                    )
                    matched += 1
                    logger.info(
                        f"Attendee {attendee['id']} → cluster {cluster_map[best_label]} "
                        f"(sim={best_sim:.4f})"
                    )
            except Exception as e:
                logger.error(f"Attendee {attendee['id']} match error: {e}")

        logger.info(f"Attendee matching: {matched}/{len(attendees)} matched")

    # ------------------------------------------------------------------
    # Notifications
    # ------------------------------------------------------------------

    def _notify_organizer(self, event_id: int):
        try:
            rows = execute_query(
                "SELECT e.name, u.email, e.owner_email "
                "FROM events e JOIN users u ON e.created_by = u.id WHERE e.id = %s",
                (event_id,),
            )
            if not rows:
                return
            event_name    = rows[0]["name"]
            creator_email = rows[0]["email"]
            owner_email   = rows[0]["owner_email"]
            dashboard_url = "https://events.digitalnexusai.com/organizer/dashboard"

            notification_service.send_organizer_processing_complete(
                creator_email, event_name, dashboard_url
            )
            if owner_email and owner_email != creator_email:
                notification_service.send_organizer_processing_complete(
                    owner_email, event_name, dashboard_url
                )
        except Exception as e:
            logger.error(f"Organizer notification failed: {e}")

    def _notify_attendees(self, event_id: int):
        try:
            event_res  = execute_query("SELECT name FROM events WHERE id = %s", (event_id,))
            event_name = event_res[0]["name"] if event_res else "Your Event"

            attendees = execute_query(
                "SELECT id, name, email, cluster_id FROM attendees WHERE event_id = %s",
                (event_id,),
            )
            if not attendees:
                return
            logger.info(f"Sending completion notifications to {len(attendees)} attendees")
            for attendee in attendees:
                notification_service.send_attendee_processing_complete(
                    attendee["email"],
                    attendee["name"],
                    event_name,
                    f"https://events.digitalnexusai.com/attendee/dashboard/"
                    f"attendee-{attendee['id']}?eventId={event_id}",
                    attendee.get("cluster_id") is not None,
                )
        except Exception as e:
            logger.error(f"Attendee notification failed: {e}")


# Singleton instance
training_service = TrainingService()
