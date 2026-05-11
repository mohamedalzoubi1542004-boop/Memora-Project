from typing import Optional
from pydantic import BaseModel


class DoctorProfileUpdate(BaseModel):
    specialization: Optional[str] = None
    bio: Optional[str] = None
    years_experience: Optional[int] = None
    license_number: Optional[str] = None


class DoctorOut(BaseModel):
    id: int
    user_id: int
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    bio: Optional[str] = None
    years_experience: Optional[int] = None
    is_approved: bool
    is_suspended: bool
    full_name: str = ""
    email: str = ""

    model_config = {"from_attributes": True}
