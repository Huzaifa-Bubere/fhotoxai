from pydantic import BaseModel, EmailStr
from typing import Optional

class OrganizerRegister(BaseModel):
    name: str
    organization: str
    email: EmailStr
    password: str
    role: str = "organizer"

class OrganizerLogin(BaseModel):
    email: str
    password: str

class SendOTP(BaseModel):
    email: EmailStr
    event_id: str

class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str
