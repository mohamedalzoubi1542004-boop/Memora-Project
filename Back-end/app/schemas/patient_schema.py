from datetime import date
from typing import Optional
from pydantic import BaseModel


class PatientProfileUpdate(BaseModel):
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None


class PatientOut(BaseModel):
    id: int
    user_id: int
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    assigned_doctor_id: Optional[int] = None
    full_name: str = ""
    email: str = ""

    model_config = {"from_attributes": True}


class PatientSummary(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    assigned_doctor_id: Optional[int] = None

    model_config = {"from_attributes": True}
