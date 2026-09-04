
import os
import cv2
import logging
import numpy as np
from PIL import Image
from typing import Dict, List, Optional, Tuple, Any, Iterable

logger = logging.getLogger("face_service_v2")

_PIL_RESAMPLING = getattr(Image, "Resampling", None)
RESAMPLE_BILINEAR = getattr(_PIL_RESAMPLING, "BILINEAR", getattr(Image, "BILINEAR", 2))

# ---------------------------------------------------------------------------
# Tunable thresholds — change here, nowhere else
# ---------------------------------------------------------------------------
DET_CONFIDENCE_MIN        = float(os.getenv("FACE_DET_CONFIDENCE_MIN", "0.60"))
FACE_SIZE_MIN_PX          = int(os.getenv("FACE_MIN_SIZE_PX", "40"))
BLUR_VARIANCE_MIN         = float(os.getenv("FACE_BLUR_VARIANCE_MIN", "35.0"))
FACE_ANGLE_MAX_DEG        = float(os.getenv("FACE_ANGLE_MAX_DEG", "40.0"))
BRIGHTNESS_MIN            = float(os.getenv("FACE_BRIGHTNESS_MIN", "50.0"))
BRIGHTNESS_MAX            = float(os.getenv("FACE_BRIGHTNESS_MAX", "220.0"))
ASPECT_RATIO_MAX          = float(os.getenv("FACE_ASPECT_RATIO_MAX", "2.5"))
FACE_AREA_RATIO_MIN       = float(os.getenv("FACE_AREA_RATIO_MIN", "0.0010"))
GRAY_STD_MIN              = float(os.getenv("FACE_GRAY_STD_MIN", "14.0"))
SKIN_FRACTION_MIN         = float(os.getenv("FACE_SKIN_FRACTION_MIN", "0.12"))
CENTER_SKIN_FRACTION_MIN  = float(os.getenv("FACE_CENTER_SKIN_FRACTION_MIN", "0.08"))
DEDUP_SIM_THRESHOLD       = float(os.getenv("FACE_DEDUP_SIM_THRESHOLD", "0.95"))
MAX_FACES_PER_IMAGE       = int(os.getenv("MAX_FACES_PER_IMAGE", "32"))
CARTOON_EDGE_DENSITY_MIN  = float(os.getenv("FACE_CARTOON_EDGE_DENSITY_MIN", "0.08"))
CARTOON_EDGE_DENSITY_MAX  = float(os.getenv("FACE_CARTOON_EDGE_DENSITY_MAX", "0.13"))
CARTOON_SAT_MEAN_MAX      = float(os.getenv("FACE_CARTOON_SAT_MEAN_MAX", "60.0"))
CARTOON_TOP3_SHARE_MIN    = float(os.getenv("FACE_CARTOON_TOP3_SHARE_MIN", "0.48"))
CARTOON_FLAT_RATIO_MIN    = float(os.getenv("FACE_CARTOON_FLAT_RATIO_MIN", "0.50"))
CARTOON_CONTEXT_PAD_RATIO = float(os.getenv("FACE_CARTOON_CONTEXT_PAD_RATIO", "0.50"))
CARTOON_CTX_FLAT_MIN      = float(os.getenv("FACE_CARTOON_CTX_FLAT_MIN", "0.48"))
CARTOON_CTX_EDGE_MAX      = float(os.getenv("FACE_CARTOON_CTX_EDGE_MAX", "0.09"))
CARTOON_CTX_TOP3_MIN      = float(os.getenv("FACE_CARTOON_CTX_TOP3_MIN", "0.45"))


class FaceServiceV2:
    def __init__(self):
        self._app = None           # InsightFace FaceAnalysis
        self._backend = None       # "insightface" | "facenet" | None
        self._device = None
        self._mtcnn = None
        self._resnet = None
        self.models_loaded = False

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def load_models(self) -> bool:
        if self.models_loaded:
            return True
        try:
            return self._load_insightface()
        except Exception as e:
            logger.warning(f"InsightFace unavailable ({e}), trying FaceNet...")
            try:
                return self._load_facenet()
            except Exception as e2:
                logger.error(f"No face model available: {e2}")
                return False

    def _load_insightface(self) -> bool:
        import torch
        from insightface.app import FaceAnalysis
        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if __import__("torch").cuda.is_available()
            else ["CPUExecutionProvider"]
        )
        self._app = FaceAnalysis(name="buffalo_l", providers=providers)
        self._app.prepare(ctx_id=0 if "CUDA" in providers[0] else -1, det_size=(640, 640))
        self._backend = "insightface"
        self.models_loaded = True
        logger.info("InsightFace buffalo_l loaded")
        return True

    def _load_facenet(self) -> bool:
        import torch
        from facenet_pytorch import MTCNN, InceptionResnetV1
        self._device = torch.device("cuda" if __import__("torch").cuda.is_available() else "cpu")
        self._mtcnn = MTCNN(
            image_size=160, margin=20, min_face_size=40,
            thresholds=[0.6, 0.7, 0.8], factor=0.709,
            post_process=True, keep_all=True, device=self._device,
        )
        self._resnet = InceptionResnetV1(pretrained="vggface2").eval().to(self._device)
        self._backend = "facenet"
        self.models_loaded = True
        logger.info("FaceNet (MTCNN + InceptionResnetV1) loaded")
        return True

    # ------------------------------------------------------------------
    # Public API — same shape as original face_service
    # ------------------------------------------------------------------

    def get_all_faces(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect all VALID faces in a BGR image.
        Returns list of dicts: {embedding, bbox, confidence, quality, angle}.
        Empty list if no valid faces found.
        """
        if not self.models_loaded:
            self.load_models()
        if self._backend == "insightface":
            raw = self._detect_insightface(image)
        elif self._backend == "facenet":
            raw = self._detect_facenet(image)
        else:
            return []

        # Quality gate — order matters, cheapest checks first
        valid = []
        for face in raw:
            reason = self._quality_reject_reason(face, image)
            if reason:
                logger.debug(f"Rejected face bbox={face.get('bbox')} reason={reason}")
            else:
                valid.append(face)

        # Dedup within the same image
        valid = self._dedup_within_image(valid)

        # Keep an optional safety cap for very dense crowd shots.
        return self._limit_faces(valid)

    def get_embedding(self, image: np.ndarray) -> Optional[Dict[str, Any]]:
        """Legacy single-face wrapper — returns best face or None."""
        faces = self.get_all_faces(image)
        if not faces:
            return None
        return max(faces, key=lambda f: f["confidence"])

    # ------------------------------------------------------------------
    # Backend-specific detection (raw, before quality gate)
    # ------------------------------------------------------------------

    def _detect_insightface(self, bgr: np.ndarray) -> List[Dict]:
        app = self._app
        if app is None:
            return []
        faces = app.get(bgr)
        results = []
        for f in faces:
            x1, y1, x2, y2 = f.bbox.astype(int)
            w, h = x2 - x1, y2 - y1
            crop = bgr[max(0, y1):y2, max(0, x1):x2]
            emb = f.embedding
            landmarks = getattr(f, "kps", None)
            if emb is None:
                continue
            emb = emb / (np.linalg.norm(emb) + 1e-10)

            # Extract yaw/pitch/roll if available
            angle = self._insightface_angle(f)

            results.append({
                "embedding": emb.astype(np.float32),
                "bbox": [int(x1), int(y1), int(w), int(h)],
                "confidence": float(f.det_score),
                "quality": self._assess_quality(crop),
                "angle": angle,
                "landmarks": np.asarray(landmarks, dtype=np.float32) if landmarks is not None else None,
                "crop": crop,
            })
        return results

    def _detect_facenet(self, bgr: np.ndarray) -> List[Dict]:
        import torch
        mtcnn = self._mtcnn
        resnet = self._resnet
        device = self._device
        if mtcnn is None or resnet is None or device is None:
            return []

        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        pil = Image.fromarray(rgb)
        detect_output = mtcnn.detect(pil, landmarks=True)
        if not isinstance(detect_output, tuple):
            return []
        if len(detect_output) == 3:
            boxes, probs, points = detect_output
        elif len(detect_output) == 2:
            boxes, probs = detect_output
            points = None
        else:
            return []
        if boxes is None:
            return []
        if probs is None:
            return []

        results = []
        arr = np.array(pil)
        h_img, w_img = arr.shape[:2]
        point_items: Iterable[Any] = points if points is not None else [None] * len(boxes)
        for box, prob, kps in zip(boxes, probs, point_items):
            if prob is None or prob < DET_CONFIDENCE_MIN:
                continue
            x1, y1, x2, y2 = [int(v) for v in box]
            w, h = x2 - x1, y2 - y1
            crop_rgb = arr[max(0, y1):y2, max(0, x1):x2]
            crop_bgr = cv2.cvtColor(crop_rgb, cv2.COLOR_RGB2BGR) if crop_rgb.size else None

            # Embedding
            pad = 20
            fx1 = max(0, x1 - pad); fy1 = max(0, y1 - pad)
            fx2 = min(w_img, x2 + pad); fy2 = min(h_img, y2 + pad)
            face_crop = arr[fy1:fy2, fx1:fx2]
            if face_crop.size == 0:
                continue
            face_pil = Image.fromarray(face_crop).resize((160, 160), RESAMPLE_BILINEAR)
            tensor = torch.FloatTensor(np.array(face_pil).transpose(2, 0, 1)).unsqueeze(0)
            tensor = (tensor - 127.5) / 128.0
            with torch.no_grad():
                emb = resnet(tensor.to(device)).detach().cpu().numpy()[0]
            emb = emb / (np.linalg.norm(emb) + 1e-10)

            angle = self._landmark_angle(kps) if kps is not None else {"yaw": 0, "pitch": 0, "roll": 0}

            results.append({
                "embedding": emb.astype(np.float32),
                "bbox": [x1, y1, w, h],
                "confidence": float(prob),
                "quality": self._assess_quality(crop_bgr) if crop_bgr is not None else 0.0,
                "angle": angle,
                "landmarks": np.asarray(kps, dtype=np.float32) if kps is not None else None,
                "crop": crop_bgr,
            })
        return results

    # ------------------------------------------------------------------
    # Quality gate — returns rejection reason string or None if valid
    # ------------------------------------------------------------------

    def _quality_reject_reason(self, face: Dict, bgr: np.ndarray) -> Optional[str]:
        # 1. Confidence
        if face["confidence"] < DET_CONFIDENCE_MIN:
            return f"low_confidence({face['confidence']:.2f})"

        # 2. Size
        _, _, w, h = face["bbox"]
        if w < FACE_SIZE_MIN_PX or h < FACE_SIZE_MIN_PX:
            return f"too_small({w}x{h})"

        # 3. Aspect ratio — rejects feet, hands, narrow background blobs
        ratio = max(w, h) / (min(w, h) + 1e-5)
        if ratio > ASPECT_RATIO_MAX:
            return f"bad_aspect({ratio:.1f})"

        # 4. Face must occupy enough of the frame to be usable for clustering.
        x, y = face["bbox"][:2]
        img_h, img_w = bgr.shape[:2]
        area_ratio = float(w * h) / max(img_h * img_w, 1)
        if area_ratio < FACE_AREA_RATIO_MIN:
            return f"too_small_relative({area_ratio:.4f})"

        # 5. Partially outside frame
        if x < 0 or y < 0 or (x + w) > img_w or (y + h) > img_h:
            return "outside_frame"

        # 6. Blur / texture / lighting
        crop = face.get("crop")
        if crop is not None and crop.size > 0:
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            gray_std = float(np.std(gray))
            if gray_std < GRAY_STD_MIN:
                return f"low_texture({gray_std:.1f})"

            blur = self._laplacian_variance(crop)
            if blur < BLUR_VARIANCE_MIN:
                return f"blurry({blur:.1f})"

            mean_brightness = float(np.mean(gray))
            if mean_brightness < BRIGHTNESS_MIN:
                return f"too_dark({mean_brightness:.1f})"
            if mean_brightness > BRIGHTNESS_MAX:
                return f"too_bright({mean_brightness:.1f})"

            landmarks = face.get("landmarks")
            if self._landmark_geometry_invalid(landmarks, face["bbox"]):
                return "bad_landmarks"

            if self._is_cartoon_or_non_face(crop, bgr, face["bbox"]):
                return "cartoon_or_non_face"

        # 7. Face angle
        angle = face.get("angle", {})
        yaw   = abs(angle.get("yaw",   0))
        pitch = abs(angle.get("pitch", 0))
        roll  = abs(angle.get("roll",  0))
        if yaw > FACE_ANGLE_MAX_DEG or pitch > FACE_ANGLE_MAX_DEG:
            return f"bad_angle(yaw={yaw:.0f} pitch={pitch:.0f})"

        return None  # passed all checks

    def _is_cartoon_or_non_face(
        self,
        crop_bgr: np.ndarray,
        full_bgr: Optional[np.ndarray] = None,
        bbox: Optional[List[int]] = None,
    ) -> bool:
        """
        Heuristic cartoon/non-face detector.
        Real faces have rich edge patterns and non-uniform color.
        Cartoons / feet / objects tend to fail one or both.
        """
        if crop_bgr is None or crop_bgr.size == 0:
            return False

        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
        gray_std = float(np.std(gray))
        if gray_std < GRAY_STD_MIN:
            return True

        # Edge density — cartoons have very sparse or very regular edges
        edges = cv2.Canny(gray, 50, 150)
        edge_density = float(np.sum(edges > 0)) / max(edges.size, 1)
        if edge_density < 0.03 or edge_density > 0.45:
            return True  # too smooth (solid object) or too noisy

        # Color variance — cartoons / feet lack skin-tone complexity
        hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
        sat_std = float(np.std(hsv[:, :, 1]))
        if sat_std < 10.0:
            return True  # near-uniform saturation → non-human

        # Skin-tone pixel fraction
        # Hue 0-25 & 340-360, Sat 20-200, Val 70-255
        skin_fraction = self._skin_fraction(hsv)
        center = hsv[hsv.shape[0] // 4:(3 * hsv.shape[0]) // 4, hsv.shape[1] // 4:(3 * hsv.shape[1]) // 4]
        center_skin_fraction = self._skin_fraction(center)
        if skin_fraction < SKIN_FRACTION_MIN or center_skin_fraction < CENTER_SKIN_FRACTION_MIN:
            return True  # less than 8% skin pixels → not a face

        if full_bgr is not None and bbox is not None and self._matches_poster_art_pattern(crop_bgr, full_bgr, bbox):
            return True

        return False

    def _matches_poster_art_pattern(
        self,
        crop_bgr: np.ndarray,
        full_bgr: np.ndarray,
        bbox: List[int],
    ) -> bool:
        if crop_bgr is None or crop_bgr.size == 0 or full_bgr is None or full_bgr.size == 0:
            return False

        crop_gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
        crop_hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
        crop_flat_ratio = self._flat_region_ratio(crop_gray)
        crop_edge_density = self._edge_density(crop_gray)
        crop_sat_mean = float(np.mean(crop_hsv[:, :, 1]))
        crop_top3_share = self._top_quantized_color_fraction(crop_bgr)

        crop_looks_drawn = (
            crop_flat_ratio > CARTOON_FLAT_RATIO_MIN
            and CARTOON_EDGE_DENSITY_MIN < crop_edge_density < CARTOON_EDGE_DENSITY_MAX
            and crop_sat_mean < CARTOON_SAT_MEAN_MAX
            and crop_top3_share > CARTOON_TOP3_SHARE_MIN
        )
        if not crop_looks_drawn:
            return False

        expanded = self._expanded_crop(full_bgr, bbox, CARTOON_CONTEXT_PAD_RATIO)
        if expanded is None or expanded.size == 0:
            return False

        expanded_gray = cv2.cvtColor(expanded, cv2.COLOR_BGR2GRAY)
        expanded_flat_ratio = self._flat_region_ratio(expanded_gray)
        expanded_edge_density = self._edge_density(expanded_gray)
        expanded_top3_share = self._top_quantized_color_fraction(expanded)

        return (
            expanded_flat_ratio > CARTOON_CTX_FLAT_MIN
            and expanded_edge_density < CARTOON_CTX_EDGE_MAX
            and expanded_top3_share > CARTOON_CTX_TOP3_MIN
        )

    @staticmethod
    def _edge_density(gray: np.ndarray) -> float:
        if gray is None or gray.size == 0:
            return 0.0
        edges = cv2.Canny(gray, 50, 150)
        return float(np.mean(edges > 0))

    @staticmethod
    def _flat_region_ratio(gray: np.ndarray, kernel_size: int = 5, std_threshold: float = 6.0) -> float:
        if gray is None or gray.size == 0:
            return 0.0
        gray_f = gray.astype(np.float32)
        mean = cv2.blur(gray_f, (kernel_size, kernel_size))
        mean_sq = cv2.blur(gray_f * gray_f, (kernel_size, kernel_size))
        local_var = np.maximum(mean_sq - (mean * mean), 0.0)
        local_std = np.sqrt(local_var)
        return float(np.mean(local_std < std_threshold))

    @staticmethod
    def _top_quantized_color_fraction(crop_bgr: np.ndarray, bins_per_channel: int = 8, top_k: int = 3) -> float:
        if crop_bgr is None or crop_bgr.size == 0:
            return 0.0
        step = max(1, 256 // bins_per_channel)
        quantized = np.clip(crop_bgr.astype(np.int32) // step, 0, bins_per_channel - 1)
        flat_codes = (
            quantized[:, :, 0]
            + bins_per_channel * quantized[:, :, 1]
            + (bins_per_channel * bins_per_channel) * quantized[:, :, 2]
        ).reshape(-1)
        counts = np.bincount(flat_codes, minlength=bins_per_channel ** 3)
        top_count = int(np.sum(np.sort(counts)[-top_k:]))
        return float(top_count) / max(flat_codes.size, 1)

    @staticmethod
    def _expanded_crop(full_bgr: np.ndarray, bbox: List[int], pad_ratio: float) -> Optional[np.ndarray]:
        if full_bgr is None or full_bgr.size == 0 or len(bbox) != 4:
            return None

        x, y, w, h = [int(v) for v in bbox]
        if w <= 0 or h <= 0:
            return None

        pad_x = int(round(w * pad_ratio))
        pad_y = int(round(h * pad_ratio))
        img_h, img_w = full_bgr.shape[:2]
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(img_w, x + w + pad_x)
        y2 = min(img_h, y + h + pad_y)
        if x2 <= x1 or y2 <= y1:
            return None
        return full_bgr[y1:y2, x1:x2]

    @staticmethod
    def _skin_fraction(hsv: np.ndarray) -> float:
        if hsv is None or hsv.size == 0:
            return 0.0
        lower1 = np.array([0, 20, 70], dtype=np.uint8)
        upper1 = np.array([25, 200, 255], dtype=np.uint8)
        lower2 = np.array([170, 20, 70], dtype=np.uint8)
        upper2 = np.array([180, 200, 255], dtype=np.uint8)
        mask = cv2.bitwise_or(
            cv2.inRange(hsv, lower1, upper1),
            cv2.inRange(hsv, lower2, upper2),
        )
        return float(np.sum(mask > 0)) / max(mask.size, 1)

    @staticmethod
    def _landmark_geometry_invalid(kps, bbox) -> bool:
        if kps is None:
            return False

        points = np.asarray(kps, dtype=np.float32)
        if points.shape != (5, 2):
            return False

        left_eye, right_eye, nose, mouth_l, mouth_r = points
        x, y, w, h = [float(v) for v in bbox]
        eye_span = float(np.linalg.norm(right_eye - left_eye))
        mouth_span = float(np.linalg.norm(mouth_r - mouth_l))
        eye_center_y = float((left_eye[1] + right_eye[1]) / 2.0)
        mouth_center_y = float((mouth_l[1] + mouth_r[1]) / 2.0)

        if left_eye[0] >= right_eye[0]:
            return True
        if eye_span < 0.18 * w or eye_span > 0.75 * w:
            return True
        if mouth_span < 0.12 * w or mouth_span > 0.75 * w:
            return True
        if abs(left_eye[1] - right_eye[1]) > 0.30 * h:
            return True
        if not (x + 0.15 * w <= nose[0] <= x + 0.85 * w):
            return True
        if not (eye_center_y + 0.05 * h <= nose[1] <= y + 0.80 * h):
            return True
        if mouth_center_y <= nose[1] or mouth_center_y < y + 0.45 * h:
            return True

        return False

    # ------------------------------------------------------------------
    # Deduplication within a single image
    # ------------------------------------------------------------------

    def _dedup_within_image(self, faces: List[Dict]) -> List[Dict]:
        """Remove near-duplicate detections of the same face in one image."""
        if len(faces) <= 1:
            return faces
        kept = []
        for face in sorted(faces, key=lambda f: f["quality"], reverse=True):
            emb = face["embedding"]
            is_dup = any(
                float(np.dot(emb, k["embedding"])) > DEDUP_SIM_THRESHOLD
                for k in kept
            )
            if not is_dup:
                kept.append(face)
        return kept

    @staticmethod
    def _limit_faces(faces: List[Dict]) -> List[Dict]:
        ranked = sorted(faces, key=lambda f: f["quality"], reverse=True)
        return ranked if MAX_FACES_PER_IMAGE <= 0 else ranked[:MAX_FACES_PER_IMAGE]

    # ------------------------------------------------------------------
    # Angle helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _insightface_angle(face) -> Dict[str, float]:
        """Extract yaw/pitch/roll from InsightFace face object."""
        if hasattr(face, "pose") and face.pose is not None:
            pose = face.pose
            if len(pose) >= 3:
                return {"pitch": float(pose[0]), "yaw": float(pose[1]), "roll": float(pose[2])}
        return {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}

    @staticmethod
    def _landmark_angle(kps) -> Dict[str, float]:
        """
        Estimate yaw from 5-point landmarks [left_eye, right_eye, nose, mouth_l, mouth_r].
        Simple heuristic: eye horizontal gap vs face width → yaw proxy.
        """
        if kps is None or len(kps) < 5:
            return {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}
        kps = np.array(kps)
        left_eye, right_eye = kps[0], kps[1]
        nose = kps[2]

        eye_center_x = (left_eye[0] + right_eye[0]) / 2
        eye_span = abs(right_eye[0] - left_eye[0])
        # Yaw proxy: nose offset from eye center relative to eye span
        yaw = ((nose[0] - eye_center_x) / (eye_span + 1e-5)) * 45.0
        # Roll: eye tilt
        dy = right_eye[1] - left_eye[1]
        dx = right_eye[0] - left_eye[0] + 1e-5
        roll = float(np.degrees(np.arctan2(dy, dx)))

        return {"yaw": float(yaw), "pitch": 0.0, "roll": roll}

    # ------------------------------------------------------------------
    # Quality / blur helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _laplacian_variance(crop: np.ndarray) -> float:
        if crop is None or crop.size == 0:
            return 0.0
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.ndim == 3 else crop
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    @staticmethod
    def _assess_quality(crop: Optional[np.ndarray]) -> float:
        """0.0–1.0 quality score combining size, sharpness, lighting."""
        if crop is None or crop.size == 0:
            return 0.0
        h, w = crop.shape[:2]
        size_score = min(1.0, min(h, w) / 120.0)

        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.ndim == 3 else crop
        blur_score = min(1.0, float(cv2.Laplacian(gray, cv2.CV_64F).var()) / 500.0)

        hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
        hist /= hist.sum() + 1e-10
        entropy = float(-np.sum(hist * np.log2(hist + 1e-10)))
        lighting_score = min(1.0, entropy / 7.5)

        return size_score * 0.25 + blur_score * 0.50 + lighting_score * 0.25


# Singleton
face_service = FaceServiceV2()
