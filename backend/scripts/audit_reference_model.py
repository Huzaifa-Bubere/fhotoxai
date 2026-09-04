"""
Audit the reference face model and compare it to the source reference folder.

Usage:
    cd C:\\photo-clustering\\ai-vision-architecture\\backend
    python scripts/audit_reference_model.py
"""

import os
import re
import sys
import json
import pickle
import argparse
from collections import Counter


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MODEL = os.path.join(BASE_DIR, "models", "face_chinese_whispers_model.pkl")
DEFAULT_REFERENCE_DIR = os.path.join(BASE_DIR, "reference_faces")
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
UTKFACE_FILENAME_RE = re.compile(r"^\d+_[01]_\d+_.+\.(jpg|jpeg|png|webp|bmp)$", re.IGNORECASE)


def _image_files(path: str):
    return sorted(
        f for f in os.listdir(path)
        if os.path.isfile(os.path.join(path, f))
        and os.path.splitext(f)[1].lower() in VALID_EXTENSIONS
    )


def _looks_like_utkface(path: str) -> bool:
    files = _image_files(path)
    if not files:
        return False
    matches = sum(1 for name in files if UTKFACE_FILENAME_RE.match(name))
    return matches >= max(10, len(files) // 2)


def audit(model_path: str, reference_dir: str):
    print(f"Model path      : {model_path}")
    print(f"Reference dir   : {reference_dir}")
    print()

    if not os.path.exists(model_path):
        print("Reference model file not found.")
        return 1

    with open(model_path, "rb") as f:
        data = pickle.load(f)

    labels = data.get("labels", [])
    label_counts = Counter(labels)
    model_keys = sorted(data.keys())

    print("Model summary")
    print(f"  Keys              : {model_keys}")
    print(f"  Version           : {data.get('version', 'missing')}")
    print(f"  Backend           : {data.get('backend', 'missing')}")
    print(f"  Embedding dim     : {data.get('embedding_dim', 'missing')}")
    print(f"  Total embeddings  : {len(data.get('embeddings', []))}")
    print(f"  Unique identities : {len(label_counts)}")
    print(f"  Label type        : {type(next(iter(labels), None)).__name__ if labels else 'n/a'}")
    print(f"  Names field       : {'present' if 'names' in data else 'missing'}")
    print(f"  Metadata complete : {'yes' if {'names', 'backend', 'embedding_dim'} <= set(model_keys) else 'no'}")
    print()

    if label_counts:
        print("Model identity counts")
        for label, count in sorted(label_counts.items(), key=lambda item: str(item[0])):
            print(f"  {label}: {count}")
        print()

    if not os.path.isdir(reference_dir):
        print("Reference folder not found, skipping source comparison.")
        return 0

    person_dirs = sorted(
        d for d in os.listdir(reference_dir)
        if os.path.isdir(os.path.join(reference_dir, d))
    )
    root_files = _image_files(reference_dir)

    print("Reference folder summary")
    print(f"  Person folders    : {len(person_dirs)}")
    print(f"  Root image files  : {len(root_files)}")
    if _looks_like_utkface(reference_dir):
        print("  Warning           : directory looks like UTKFace, which is not identity labeled")
    print()

    if person_dirs:
        print("Reference folder identities")
        for person in person_dirs:
            count = len(_image_files(os.path.join(reference_dir, person)))
            print(f"  {person}: {count}")
        print()

    if person_dirs and len(person_dirs) != len(label_counts):
        print(
            "Mismatch warning  : source folder identity count does not match model identity count "
            f"({len(person_dirs)} folders vs {len(label_counts)} model labels)"
        )

    if root_files and not person_dirs:
        print("Layout warning     : source folder is flat, but the builder expects one subdirectory per person")

    print("JSON metadata preview")
    preview = {
        "version": data.get("version"),
        "backend": data.get("backend"),
        "embedding_dim": data.get("embedding_dim"),
        "people_count": data.get("people_count"),
        "embedding_count": data.get("embedding_count"),
        "source_dir": data.get("source_dir"),
    }
    print(json.dumps(preview, indent=2))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audit the reference face model")
    parser.add_argument("--model-path", default=DEFAULT_MODEL, help="Path to the .pkl model")
    parser.add_argument(
        "--reference-dir",
        default=DEFAULT_REFERENCE_DIR,
        help="Path to the source reference_faces directory",
    )
    args = parser.parse_args()
    raise SystemExit(audit(args.model_path, args.reference_dir))
