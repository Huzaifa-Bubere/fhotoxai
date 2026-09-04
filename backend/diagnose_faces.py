"""
Diagnostic script for face detection & clustering on event_42 images.

Self-contained: does NOT import training_service or database modules.
Instead, directly uses face_service_v2 and clustering_service.

Usage:
    cd C:\\photo-clustering\\ai-vision-architecture\\backend
    python diagnose_faces.py
"""

import os
import sys
import cv2
import numpy as np
import logging
import time
from collections import Counter

# Make sure backend modules are importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("diagnose")

# ── paths ──────────────────────────────────────────────────────────────
PHOTO_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "uploads", "event_41", "event_42",
)


# ── Inline second-pass filter (avoids importing training_service) ─────
MIN_FACE_CONFIDENCE  = 0.60
MIN_FACE_SIZE_PX     = 40
MIN_FACE_QUALITY     = 0.10
BLUR_VARIANCE_MIN    = 35.0
MAX_FACES_PER_IMAGE  = 32


def compute_blur(crop):
    if crop is None or crop.size == 0:
        return 0.0
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.ndim == 3 else crop
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def second_pass_filter(faces, image):
    """Mimics training_service.preprocess_faces_for_clustering without DB."""
    valid = []
    rejected = Counter()
    h, w = image.shape[:2]

    for f in faces:
        confidence = float(f.get("confidence", 0))
        if confidence < MIN_FACE_CONFIDENCE:
            rejected["low_confidence"] += 1
            continue

        bbox = f.get("bbox")
        if bbox is None or len(bbox) != 4:
            rejected["invalid_bbox"] += 1
            continue

        x, y, bw, bh = [int(v) for v in bbox]
        if bw < MIN_FACE_SIZE_PX or bh < MIN_FACE_SIZE_PX:
            rejected["small_face"] += 1
            continue

        quality = float(f.get("quality", 0))
        if quality < MIN_FACE_QUALITY:
            rejected["low_quality"] += 1
            continue

        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(w, x + bw), min(h, y + bh)
        crop = image[y1:y2, x1:x2]
        blur = compute_blur(crop)
        if blur < BLUR_VARIANCE_MIN:
            rejected["blurry"] += 1
            continue

        emb = f.get("embedding")
        if emb is None:
            rejected["no_embedding"] += 1
            continue

        arr = np.asarray(emb, dtype=np.float32).reshape(-1)
        norm = float(np.linalg.norm(arr))
        if norm <= 1e-10:
            rejected["zero_embedding"] += 1
            continue

        valid.append({
            "embedding": arr / norm,
            "bbox": [x, y, bw, bh],
            "confidence": confidence,
            "quality": quality,
        })

    # Cap faces per image
    if MAX_FACES_PER_IMAGE > 0 and len(valid) > MAX_FACES_PER_IMAGE:
        valid.sort(key=lambda f: (f["confidence"], f["quality"]), reverse=True)
        valid = valid[:MAX_FACES_PER_IMAGE]

    return valid, rejected


def main():
    # ── 1. Discover images ─────────────────────────────────────────────
    if not os.path.isdir(PHOTO_DIR):
        logger.error(f"Photo directory not found: {PHOTO_DIR}")
        return

    extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    image_files = sorted(
        f for f in os.listdir(PHOTO_DIR)
        if os.path.splitext(f)[1].lower() in extensions
    )
    logger.info(f"Found {len(image_files)} images in {PHOTO_DIR}")

    # ── 2. Load face models ────────────────────────────────────────────
    from ai_api.services.face_service import face_service
    from ai_api.services.face_service import (
        DET_CONFIDENCE_MIN, FACE_SIZE_MIN_PX,
        BLUR_VARIANCE_MIN as FSV2_BLUR, FACE_ANGLE_MAX_DEG,
    )

    logger.info("=== Current face_service_v2 thresholds ===")
    logger.info(f"  DET_CONFIDENCE_MIN = {DET_CONFIDENCE_MIN}")
    logger.info(f"  FACE_SIZE_MIN_PX   = {FACE_SIZE_MIN_PX}")
    logger.info(f"  BLUR_VARIANCE_MIN  = {FSV2_BLUR}")
    logger.info(f"  FACE_ANGLE_MAX_DEG = {FACE_ANGLE_MAX_DEG}")

    logger.info("Loading face models (this may take a minute)...")
    t0 = time.time()
    if not face_service.load_models():
        logger.error("Failed to load face models!")
        return
    logger.info(f"Models loaded in {time.time() - t0:.1f}s  (backend={face_service._backend})")

    # ── 3. Detect faces per image ──────────────────────────────────────
    all_embeddings = []
    total_raw = 0
    total_valid = 0
    per_image_stats = []
    all_rejections = Counter()

    for i, fname in enumerate(image_files):
        path = os.path.join(PHOTO_DIR, fname)
        img = cv2.imread(path)
        if img is None:
            logger.warning(f"  [{i+1}/{len(image_files)}] SKIP (unreadable): {fname}")
            continue

        # Raw detection (includes quality gate inside face_service_v2)
        faces = face_service.get_all_faces(img)
        raw_count = len(faces)

        # Second-pass quality gate
        prepared, rejected = second_pass_filter(faces, img)
        valid_count = len(prepared)

        total_raw += raw_count
        total_valid += valid_count
        all_rejections.update(rejected)

        per_image_stats.append({
            "file": fname, "raw": raw_count, "valid": valid_count,
        })

        for face in prepared:
            all_embeddings.append(face["embedding"])

        status = "OK" if valid_count > 0 else "NO FACES"
        logger.info(
            f"  [{i+1:3d}/{len(image_files)}] {fname[:40]:40s}  "
            f"raw={raw_count:2d}  valid={valid_count:2d}  "
            f"rej={dict(rejected)}  [{status}]"
        )

    # ── 4. Summary ─────────────────────────────────────────────────────
    print("\n" + "=" * 72)
    print("FACE DETECTION SUMMARY")
    print("=" * 72)
    print(f"  Total images scanned : {len(image_files)}")
    print(f"  Total raw detections : {total_raw}")
    print(f"  Total valid faces    : {total_valid}")
    print(f"  Images with 0 faces  : {sum(1 for s in per_image_stats if s['valid'] == 0)}")
    print(f"  Images with 1 face   : {sum(1 for s in per_image_stats if s['valid'] == 1)}")
    print(f"  Images with 2+ faces : {sum(1 for s in per_image_stats if s['valid'] >= 2)}")

    if all_rejections:
        print(f"\n  Rejection breakdown:")
        for reason, count in all_rejections.most_common():
            print(f"    {reason:25s} : {count}")

    # ── 5. Clustering ──────────────────────────────────────────────────
    if len(all_embeddings) < 2:
        print("\n  Not enough faces for clustering.")
        return

    from ai_api.services.clustering_service import (
        ClusteringServiceV2, ClusteringConfigV2,
    )

    CLUSTERING_THRESHOLD = 0.50
    MERGE_THRESHOLD      = 0.50

    print(f"\n  Clustering thresholds:")
    print(f"    CLUSTERING_THRESHOLD = {CLUSTERING_THRESHOLD}")
    print(f"    MERGE_THRESHOLD      = {MERGE_THRESHOLD}")

    embeddings_array = np.array(all_embeddings, dtype=np.float32)

    config = ClusteringConfigV2(
        edge_similarity_threshold  = CLUSTERING_THRESHOLD,
        merge_similarity_threshold = MERGE_THRESHOLD,
        dbscan_eps                 = 0.50,
        dbscan_min_samples         = 2,
        knn_k                      = 30,
        cw_iterations              = 30,
        keep_singletons            = False,
        noise_assignment_threshold = 0.55,
    )

    svc = ClusteringServiceV2()
    labels, centroids = svc.cluster_embeddings(embeddings_array, config)
    n_clusters = len(centroids)

    print(f"\n  CLUSTERING RESULT")
    print(f"    Total faces clustered : {len(labels)}")
    print(f"    Clusters (persons)    : {n_clusters}")

    unique, counts = np.unique(labels, return_counts=True)
    cluster_sizes = sorted(counts, reverse=True)
    print(f"    Cluster sizes         : {cluster_sizes}")
    print(f"    Singletons            : {sum(1 for c in cluster_sizes if c == 1)}")
    print("=" * 72)


if __name__ == "__main__":
    main()
