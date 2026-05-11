from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    doctor_id: int
    scheduled_at: datetime
    notes: Optional[str] = None


class AppointmentOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    status: str
    notes: Optional[str] = None
    created_at: datetime
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None

    model_config = {"from_attributes": True}
