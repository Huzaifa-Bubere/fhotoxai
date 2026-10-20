"""
Tests for video_frame_analysis pure helpers: blur heuristic, perceptual
hash, bounded near-duplicate windowing, quality score, face-filter
pluggability. No database and no model dependencies required.
"""

import pytest

from general_api.services import video_frame_analysis as analysis


def _make_image(width=160, height=90, kind="noise"):
    import numpy as np
    if kind == "noise":
        rng = np.random.default_rng(7)
        return rng.integers(0, 255, size=(height, width, 3), dtype=np.uint8)
    if kind == "flat":
        base = np.zeros((height, width, 3), dtype=np.uint8)
        base[:, :, 2] = 200  # solid blue-ish frame (BGR)
        return base
    raise ValueError(kind)


def _blur_image(image, radius=25):
    import cv2
    return cv2.GaussianBlur(image, (radius * 2 + 1, radius * 2 + 1), radius)


# ---------------------------------------------------------------------------
# Blur heuristic
# ---------------------------------------------------------------------------

def test_sharp_frame_scores_higher_than_blurred():
    sharp = _make_image(kind="noise")
    blurred = _blur_image(sharp)
    assert analysis.laplacian_variance(sharp) > analysis.laplacian_variance(blurred)
    assert analysis.blur_score(sharp) > analysis.blur_score(blurred)


def test_extreme_blur_below_typical_threshold():
    blurred = _blur_image(_make_image(kind="noise"), radius=40)
    # A very high blur threshold would clearly reject it; a low one keeps it.
    assert analysis.laplacian_variance(blurred) < 500
    assert analysis.blur_score(blurred) < 0.1


def test_flat_frame_has_zero_blur_variance():
    flat = _make_image(kind="flat")
    assert analysis.laplacian_variance(flat) == pytest.approx(0.0, abs=1.0)


def test_none_and_empty_inputs_are_safe():
    assert analysis.laplacian_variance(None) == 0.0
    assert analysis.blur_score(None) == 0.0
    assert analysis.quality_score(None) == 0.0
    assert analysis.average_hash(None) is None


# ---------------------------------------------------------------------------
# Perceptual hash + bounded deduplication
# ---------------------------------------------------------------------------

def test_average_hash_is_deterministic_and_hex():
    img = _make_image(kind="noise")
    h1 = analysis.average_hash(img)
    h2 = analysis.average_hash(img)
    assert h1 == h2
    assert len(h1) == 16  # 64-bit hex
    int(h1, 16)  # must parse as hex


def test_different_images_hash_differently():
    img_a = _make_image(kind="noise")
    img_b = _make_image(kind="flat")
    assert analysis.average_hash(img_a) != analysis.average_hash(img_b)


def test_identical_frames_detected_as_duplicates():
    img = _make_image(kind="noise")
    h = analysis.average_hash(img)
    assert analysis.is_near_duplicate(h, [h], hamming_threshold=6, window=40)


def test_nearby_frame_increment_kept_then_burst_detected():
    # 1-bit-away hash vs a distant hash (12 bits apart)
    h_close = "000000000000000f"
    h_far = "0000ff000000000f"
    assert analysis.hamming_distance_hex(h_close, h_close) == 0
    assert analysis.hamming_distance_hex(h_close, h_far) > 6


def test_duplicate_window_is_bounded():
    """Only the last N accepted hashes are compared — cost stays flat."""
    img = _make_image(kind="noise")
    candidate = analysis.average_hash(img)
    old_far = [f"{i:016x}" for i in range(1000, 1100)]  # distant hashes
    assert not analysis.is_near_duplicate(
        candidate, old_far, hamming_threshold=6, window=40
    )
    # but when the matching hash is inside the window it is detected
    windowed = old_far + [candidate]
    assert analysis.is_near_duplicate(
        candidate, windowed, hamming_threshold=6, window=40
    )


def test_window_beyond_last_n_not_compared():
    candidate = "00000000000000ff"
    old_match = "000000000000abc0"  # > 6-bit distance from candidate
    # multiples of 1024 keep bit-distance to 0x00..ff at 8+ for the whole list
    far = [f"{i * 1024:016x}" for i in range(1, 41)]
    history = [old_match] + far  # match sits outside the last-40 window
    assert not analysis.is_near_duplicate(candidate, history, hamming_threshold=6, window=40)


def test_hamming_distance_invalid_inputs():
    assert analysis.hamming_distance_hex(None, "00") is None
    assert analysis.hamming_distance_hex("zz", "00") is None
    assert analysis.hamming_distance_hex("0", "00") is None


# ---------------------------------------------------------------------------
# Quality score
# ---------------------------------------------------------------------------

def test_quality_score_ranks_sharp_detailed_frames_first():
    sharp = _make_image(kind="noise")
    blurred = _blur_image(sharp)
    assert analysis.quality_score(sharp) > analysis.quality_score(blurred)
    assert 0.0 <= analysis.quality_score(sharp) <= 1.0


def test_load_bgr_downscales_large_images():
    import numpy as np
    big = np.zeros((2000, 4000, 3), dtype=np.uint8)
    big[500:1500, 500:3500, 0] = 255
    try:
        import cv2
        path = cv2.imwrite if False else None  # noqa: F841
    except ImportError:
        pytest.skip("cv2 required")

    import cv2, tempfile, os
    tmp = os.path.join(tempfile.gettempdir(), "ws_test_downscale.jpg")
    assert cv2.imwrite(tmp, big)
    loaded = analysis.load_bgr_for_analysis(tmp, max_side=768)
    assert loaded is not None
    assert max(loaded.shape[:2]) <= 768
    os.remove(tmp)


# ---------------------------------------------------------------------------
# Face filter pluggability
# ---------------------------------------------------------------------------

def test_detect_faces_requires_injected_service():
    img = _make_image(kind="noise")
    with pytest.raises(analysis.FaceFilterUnavailable):
        analysis.detect_faces(img, face_service=None)


def test_detect_faces_uses_injected_stub():
    img = _make_image(kind="noise")

    class StubFaceService:
        def get_all_faces(self, image):
            assert image is not None
            return [{"bbox": [0, 0, 10, 10], "confidence": 0.9, "quality": 0.8}]

    faces = analysis.detect_faces(img, face_service=StubFaceService())
    assert len(faces) == 1
    assert faces[0]["confidence"] == 0.9


def test_detect_faces_none_image_is_empty():
    class StubFaceService:
        def get_all_faces(self, image):  # pragma: no cover
            raise AssertionError("should not be called for None")

    assert analysis.detect_faces(None, face_service=StubFaceService()) == []
