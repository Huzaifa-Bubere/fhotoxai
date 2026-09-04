from pydantic import BaseModel
from typing import List, Dict, Optional

class TrainingMetrics(BaseModel):
    total_photos: int
    total_faces: int
    unique_identities: int
    completion_status: str
    last_training_timestamp: Optional[str] = None
    training_in_progress: bool

class FolderInfo(BaseModel):
    id: str
    name: str
    date: str
    total_photos: int
    subfolders: List[Dict]

class PhotoInfo(BaseModel):
    id: str
    url: str
    title: str
    tags: List[str]
