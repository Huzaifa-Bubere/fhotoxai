from pydantic import BaseModel
from typing import Optional, List

class EventCreate(BaseModel):
    name: str
    date: str
    location: str
    description: Optional[str] = None
    photography_service: bool = True
    data_retention: str = '3'
    photographer_ids: Optional[str] = None
    registration_url_base: Optional[str] = None
    event_type: str = 'corporate'

class EventUpdateStatus(BaseModel):
    status: str

class PhotographerAssignment(BaseModel):
    photographer_id: int
