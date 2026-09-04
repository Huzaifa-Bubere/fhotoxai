from pydantic import BaseModel, EmailStr
from typing import Optional, List

class AttendeeRegister(BaseModel):
    event_id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    # Selfie is handled via UploadFile

class AttendeeInfo(BaseModel):
    id: int
    name: str
    email: str
    event_id: int
