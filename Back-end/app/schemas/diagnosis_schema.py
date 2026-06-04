from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class DiagnosisOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: Optional[int] = None
    image_path: str
    classification: str
    confidence: float
    probabilities: Optional[Dict[str, Any]] = None
    doctor_notes: Optional[str] = None
    status: str = "pending"          # pending | completed
    created_at: datetime

    model_config = {"from_attributes": True}


class DiagnosisNotesUpdate(BaseModel):
    doctor_notes: str


class DiagnosisApprove(BaseModel):
    doctor_notes: Optional[str] = None


class AIResult(BaseModel):
    classification: str
    confidence: float
    probabilities: Dict[str, float]
