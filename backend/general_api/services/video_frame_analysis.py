"""
Frame-image analysis for the Video-to-Video extraction feature.

Pure helpers (no database, no global state) so they are unit-testable:

- blur score: Laplacian variance heuristic (the same metric family the
  existing face-quality helpers use for face crops, here applied to the
  whole frame). Thresholds are configurable; treat as a heuristic only.
- perceptual hash (aHash, 64-bit) for near-duplicate frame detection.
  Face-embedding similarity is NOT used here: it would wrongly discard
  different photos of the same person. Identity similarity stays the
  job of the clustering stage.
- quality score: cheap composite of size, sharpness and lighting.
- face filter: pluggable. The worker wires the existing face service
  (InsightFace with FaceNet fallback); if it is unavailable the caller
  decides whether to fail the job (faces-only requested) or skip the
  filter.
"""

import logging
from typing import Dict, List, Optional

import cv2
import numpy as np

logger = logging.getLogger("video_frame_analysis")


def load_bgr_for_analysis(path: str, max_side: int = 768) -> Optional[np.ndarray]:
    """Read an image downscaled so the longest side is <= max_side."""
    try:
        data = np.fromfile(path, dtype=np.uint8)  # unicode-safe on Windows
    except (OSError, ValueError):
        return None
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if img is None:
        return None
    h, w = img.shape[:2]
    long_side = max(h, w)
    if long_side > max_side:
        scale = max_side / float(long_side)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def laplacian_variance(image: Optional[np.ndarray]) -> float:
    if image is None or image.size == 0:
        return 0.0
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def blur_score(image: Optional[np.ndarray]) -> float:
    """Normalized sharpness in [0, 1] (1 = crisp)."""
    return min(1.0, laplacian_variance(image) / 500.0)


def average_hash(image: Optional[np.ndarray], hash_size: int = 8) -> Optional[str]:
    """64-bit average hash as 16-hex-char string; None if unreadable."""
    if image is None or image.size == 0:
        return None
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    resized = cv2.resize(gray, (hash_size, hash_size), interpolation=cv2.INTER_AREA)
    mean = float(resized.mean())
    bits = (resized > mean).astype(np.uint8).flatten()
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)
    return f"{value:0{hash_size * hash_size // 4}x}"


def hamming_distance_hex(hash_a: str, hash_b: str) -> Optional[int]:
    """Hamming distance between two equal-length hex hashes."""
    if not hash_a or not hash_b or len(hash_a) != len(hash_b):
        return None
    try:
        a, b = int(hash_a, 16), int(hash_b, 16)
    except ValueError:
        return None
    return bin(a ^ b).count("1")


def is_near_duplicate(
    candidate_hash: Optional[str],
    accepted_hashes: List[str],
    hamming_threshold: int = 6,
    window: int = 40,
) -> bool:
    """
    Compare only against the last ``window`` accepted hashes so comparison
    cost stays bounded no matter how long the video is.
    """
    if not candidate_hash or not accepted_hashes:
        return False
    recent = accepted_hashes[-window:]
    for existing in recent:
        distance = hamming_distance_hex(candidate_hash, existing)
        if distance is not None and distance <= hamming_threshold:
            return True
    return False


def quality_score(image: Optional[np.ndarray]) -> float:
    """0..1 composite: 50% sharpness + 25% lighting + 25% size."""
    if image is None or image.size == 0:
        return 0.0
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    sharpness = blur_score(image)
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
    hist = hist / (hist.sum() + 1e-10)
    entropy = float(-np.sum(hist * np.log2(hist + 1e-10)))
    lighting = min(1.0, entropy / 8.0)
    size = min(1.0, min(image.shape[:2]) / 720.0)
    return sharpness * 0.5 + lighting * 0.25 + size * 0.25


# ---------------------------------------------------------------------------
# Face filter (optional)
# ---------------------------------------------------------------------------


class FaceFilterUnavailable(RuntimeError):
    """Raised when faces-only is requested but no detector can load."""


def detect_faces(image: Optional[np.ndarray], face_service=None) -> List[Dict]:
    """
    Detect faces in a BGR frame using the shared face service passed in by
    the caller (kept out of this module so tests can inject a stub).
    Returns a list of {bbox, confidence, quality, embedding?} dicts.
    """
    if image is None:
        return []
    if face_service is None:
        raise FaceFilterUnavailable("No face detector wired for this worker.")
    return face_service.get_all_faces(image) or []
