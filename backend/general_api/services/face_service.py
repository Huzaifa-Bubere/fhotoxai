import os
import cv2
import torch
import numpy as np
import logging
from PIL import Image
from typing import Any, Optional
from types import SimpleNamespace
import torch.nn.functional as F

# Try to import InsightFace
try:
    from insightface.app import FaceAnalysis
    HAS_INSIGHTFACE = True
except ImportError:
    FaceAnalysis = None
    HAS_INSIGHTFACE = False

# Try to import FaceNet fallback
try:
    from facenet_pytorch import MTCNN, InceptionResnetV1
    HAS_FACENET = True
except ImportError:
    MTCNN = None
    InceptionResnetV1 = None
    HAS_FACENET = False

from general_api.model_manager import get_device

logger = logging.getLogger("face_service")

# Pillow >= 9.1 prefers Image.Resampling, keep fallback for older versions.
_PIL_RESAMPLING = getattr(Image, "Resampling", None)
RESAMPLE_BILINEAR = getattr(_PIL_RESAMPLING, "BILINEAR", getattr(Image, "BILINEAR", 2))

class FaceService:
    def __init__(self):
        self.face_app = None
        self.using_insightface = False
        self.mtcnn = None
        self.resnet = None
        self.device = None
        self.models_loaded = False
        self.backend_name = None
        self.use_mtcnn_detector = False

    def _load_insightface(self):
        if FaceAnalysis is None:
            raise RuntimeError("InsightFace is not installed")
        logger.info("Loading InsightFace...")
        use_gpu = torch.cuda.is_available()
        providers = ['CUDAExecutionProvider', 'CPUExecutionProvider'] if use_gpu else ['CPUExecutionProvider']
        self.face_app = FaceAnalysis(name="buffalo_l", providers=providers)
        self.face_app.prepare(ctx_id=0 if use_gpu else -1, det_size=(640, 640))
        self.using_insightface = True
        self.backend_name = "insightface"
        self.models_loaded = True
        logger.info("InsightFace loaded successfully.")
        return True

    def _load_mtcnn_detector(self):
        if MTCNN is None:
            raise RuntimeError("facenet-pytorch is not installed (MTCNN unavailable)")
        logger.info("Loading MTCNN detector...")
        self.device = get_device()
        self.mtcnn = MTCNN(
            image_size=160,
            margin=20,
            min_face_size=20,
            thresholds=[0.5, 0.6, 0.7],
            factor=0.709,
            post_process=True,
            keep_all=True,
            device=self.device,
        )
        self.use_mtcnn_detector = True
        logger.info("MTCNN detector loaded successfully.")
        return True

    def _load_facenet(self):
        if InceptionResnetV1 is None:
            raise RuntimeError("facenet-pytorch is not installed (InceptionResnetV1 unavailable)")
        logger.info("Loading FaceNet...")
        self.device = get_device()
        if self.mtcnn is None:
            self._load_mtcnn_detector()
        self.resnet = InceptionResnetV1(pretrained="vggface2").eval().to(self.device)
        self.using_insightface = False
        self.backend_name = "facenet"
        self.models_loaded = True
        logger.info("FaceNet loaded successfully.")
        return True

    def load_models(self):
        if self.models_loaded:
            return True

        preferred_backend = os.getenv("FACE_BACKEND", "auto").strip().lower()
        use_gpu = torch.cuda.is_available()

        if preferred_backend == "facenet":
            backend_order = ["facenet", "insightface"]
        else:
            backend_order = ["insightface", "facenet"]

        for backend in backend_order:
            if backend == "insightface" and HAS_INSIGHTFACE:
                try:
                    self._load_insightface()
                    if not use_gpu and HAS_FACENET:
                        try:
                            self._load_mtcnn_detector()
                            logger.info("Using MTCNN detector with InsightFace embeddings for CPU mode.")
                        except Exception as detector_error:
                            logger.warning(f"MTCNN detector failed to load: {detector_error}.")
                    return True
                except Exception as e:
                    logger.warning(f"InsightFace failed to load: {e}.")
            if backend == "facenet" and HAS_FACENET:
                try:
                    return self._load_facenet()
                except Exception as e:
                    logger.error(f"FaceNet failed to load: {e}")

        return False

    def _to_bgr_and_pil(self, face_image):
        if hasattr(face_image, 'convert'):
            img_pil = face_image.convert('RGB')
            img_bgr = cv2.cvtColor(np.asarray(img_pil, dtype=np.uint8), cv2.COLOR_RGB2BGR)
            return img_bgr, img_pil
        if isinstance(face_image, np.ndarray) and face_image.ndim == 3 and face_image.shape[2] == 3:
            img_bgr = face_image
            img_rgb = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
            img_pil = Image.fromarray(img_rgb)
            return img_bgr, img_pil
        return None, None

    def _detect_with_mtcnn_arcface(self, face_image):
        img_bgr, img_pil = self._to_bgr_and_pil(face_image)
        if img_bgr is None or img_pil is None or self.mtcnn is None or self.face_app is None:
            return []

        detect_output = self.mtcnn.detect(img_pil, landmarks=True)
        if not isinstance(detect_output, tuple):
            return []
        if len(detect_output) == 3:
            boxes, probs, points = detect_output
        elif len(detect_output) == 2:
            boxes, probs = detect_output
            points = None
        else:
            return []

        if boxes is None or len(boxes) == 0 or points is None:
            return []

        models = getattr(self.face_app, "models", None)
        if models is None:
            return []

        recognition_model = models.get("recognition")
        if recognition_model is None:
            return []

        results = []
        img_height, img_width = img_bgr.shape[:2]

        for box, prob, kps in zip(boxes, probs, points):
            if prob is None or prob < 0.9:
                continue

            x1, y1, x2, y2 = box
            w = x2 - x1
            h = y2 - y1
            if w < 20 or h < 20:
                continue

            face = SimpleNamespace(kps=np.asarray(kps, dtype=np.float32))
            embedding = recognition_model.get(img_bgr, face)

            crop_x1 = max(0, int(x1))
            crop_y1 = max(0, int(y1))
            crop_x2 = min(img_width, int(x2))
            crop_y2 = min(img_height, int(y2))
            face_crop = img_bgr[crop_y1:crop_y2, crop_x1:crop_x2]
            quality = self.assess_quality(face_crop, is_bgr=True)

            results.append({
                "embedding": embedding,
                "bbox": [crop_x1, crop_y1, max(0, crop_x2 - crop_x1), max(0, crop_y2 - crop_y1)],
                "confidence": float(prob),
                "quality": quality,
            })

        return results

    def get_all_faces(self, face_image):
        """Detect ALL faces in an image and return a list of face data dicts.
        Each dict contains: embedding, bbox [x,y,w,h], confidence, quality.
        Returns empty list if no faces found.
        """
        if not self.models_loaded:
            self.load_models()
        
        results = []

        if self.using_insightface:
            if self.use_mtcnn_detector:
                return self._detect_with_mtcnn_arcface(face_image)

            if self.face_app is None:
                return []

            img_bgr, _ = self._to_bgr_and_pil(face_image)
            if img_bgr is None:
                return []

            faces = self.face_app.get(img_bgr)
            if not faces:
                return []
            
            for face in faces:
                x1, y1, x2, y2 = face.bbox
                w = x2 - x1
                h = y2 - y1
                
                # Skip tiny detections (likely false positives)
                if w < 20 or h < 20:
                    continue
                
                quality = self.assess_quality(
                    img_bgr[max(0, int(y1)):int(y2), max(0, int(x1)):int(x2)],
                    is_bgr=True
                )
                
                results.append({
                    "embedding": face.embedding,
                    "bbox": [int(x1), int(y1), int(w), int(h)],
                    "confidence": float(face.det_score),
                    "quality": quality
                })
            
            return results

        else:
            # FaceNet logic — single-pass detection + alignment
            try:
                img_pil = None
                if isinstance(face_image, np.ndarray):
                    img_rgb = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
                    img_pil = Image.fromarray(img_rgb)
                elif hasattr(face_image, 'convert'):
                    img_pil = face_image.convert('RGB')
                else:
                    return []

                if self.mtcnn is None or self.resnet is None or self.device is None:
                    return []

                # Single detection pass
                detect_output = self.mtcnn.detect(img_pil)
                if not isinstance(detect_output, tuple):
                    return []
                if len(detect_output) == 2:
                    boxes, probs = detect_output
                elif len(detect_output) == 3:
                    boxes, probs, _ = detect_output
                else:
                    return []
                
                if boxes is None or len(boxes) == 0:
                    return []
                
                img_array = np.asarray(img_pil, dtype=np.uint8)
                
                for idx in range(len(boxes)):
                    box = boxes[idx]
                    prob = probs[idx]
                    
                    if prob < 0.9:
                        continue
                    
                    x1, y1, x2, y2 = box
                    w = x2 - x1
                    h = y2 - y1
                    
                    if w < 20 or h < 20:
                        continue
                    
                    # Direct crop + resize (no second MTCNN detection pass)
                    pad = 20
                    fx1 = max(0, int(x1) - pad)
                    fy1 = max(0, int(y1) - pad)
                    fx2 = min(img_array.shape[1], int(x2) + pad)
                    fy2 = min(img_array.shape[0], int(y2) + pad)
                    
                    face_crop = img_array[fy1:fy2, fx1:fx2]
                    if face_crop.size == 0:
                        continue
                    
                    face_pil = Image.fromarray(face_crop)
                    face_resized = face_pil.resize((160, 160), RESAMPLE_BILINEAR)
                    face_tensor = torch.FloatTensor(np.asarray(face_resized, dtype=np.uint8).transpose(2, 0, 1)).unsqueeze(0)
                    face_tensor = (face_tensor - 127.5) / 128.0
                    face_tensor = face_tensor.to(self.device)
                    
                    with torch.no_grad():
                        embedding = self.resnet(face_tensor)
                    
                    quality = self.assess_quality(face_crop, is_bgr=False)
                    
                    results.append({
                        "embedding": embedding.detach().cpu().numpy()[0],
                        "bbox": [int(x1), int(y1), int(w), int(h)],
                        "confidence": float(prob),
                        "quality": quality
                    })
                
                return results
                
            except Exception as e:
                logger.error(f"FaceNet multi-face detection failed: {e}")
                return []
        
        return []
    
    def get_embedding(self, face_image):
        """Legacy wrapper — returns single best face data dict or None."""
        faces = self.get_all_faces(face_image)
        if not faces:
            return None
        # Return the face with highest confidence
        faces.sort(key=lambda f: f['confidence'], reverse=True)
        return faces[0]

    def assess_quality(self, face_image, is_bgr=False):
        """Assess face image quality. Handles both BGR (InsightFace) and RGB (FaceNet) inputs."""
        if hasattr(face_image, 'convert'):
            face_array = np.asarray(face_image.convert('RGB'), dtype=np.uint8)
            is_bgr = False
        else:
            face_array = face_image
        
        if face_array.size == 0 or face_array.ndim < 2:
            return 0.0
        
        height, width = face_array.shape[:2]
        size_score = min(1.0, min(height, width) / 80.0)
        
        if face_array.ndim == 3 and face_array.shape[2] == 3:
            gray = cv2.cvtColor(face_array, cv2.COLOR_BGR2GRAY if is_bgr else cv2.COLOR_RGB2GRAY)
        elif face_array.ndim == 2:
            gray = face_array
        else:
            return size_score
        
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_score = min(1.0, laplacian_var / 500.0)
        
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist.flatten() / hist.sum()
        entropy = -np.sum(hist * np.log2(hist + 1e-10))
        lighting_score = min(1.0, entropy / 8.0)
        
        return (size_score * 0.3 + blur_score * 0.4 + lighting_score * 0.3)

# Singleton instance
face_service = FaceService()
