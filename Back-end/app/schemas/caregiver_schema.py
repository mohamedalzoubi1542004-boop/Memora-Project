from datetime import datetime
from typing import Dict
from pydantic import BaseModel


class CaregiverAssessmentCreate(BaseModel):
    patient_id: int
    scores: Dict[str, int]   # {"q1": 2, ..., "q10": 1}


class CaregiverAssessmentOut(BaseModel):
    id: int
    user_id: int
    patient_id: int
    scores: Dict
    total_score: int
    burnout_level: str
    created_at: datetime

    model_config = {"from_attributes": True}
