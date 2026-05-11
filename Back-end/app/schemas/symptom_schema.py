from datetime import datetime
from typing import Dict
from pydantic import BaseModel


class SymptomCreate(BaseModel):
    patient_id: int
    scores: Dict[str, int]   # {"q1": 0, "q2": 1, ..., "q12": 2}


class SymptomOut(BaseModel):
    id: int
    patient_id: int
    scores: Dict
    total_score: int
    severity_level: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SymptomSummary(BaseModel):
    latest_score: int
    severity_level: str
    total_entries: int
    history: list
