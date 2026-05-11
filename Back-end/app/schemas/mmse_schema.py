from datetime import datetime
from typing import Optional
from pydantic import BaseModel, model_validator


class MMSECreate(BaseModel):
    patient_id: int
    temporal_orientation: int = 0   # 0-5
    spatial_orientation: int = 0    # 0-5
    registration: int = 0           # 0-3
    attention_calculation: int = 0  # 0-5
    recall: int = 0                 # 0-3
    naming: int = 0                 # 0-2
    repetition: int = 0             # 0-1
    three_stage_command: int = 0    # 0-3
    reading: int = 0                # 0-1
    writing: int = 0                # 0-1
    copying: int = 0                # 0-1


class MMSEOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: Optional[int] = None
    temporal_orientation: int
    spatial_orientation: int
    registration: int
    attention_calculation: int
    recall: int
    naming: int
    repetition: int
    three_stage_command: int
    reading: int
    writing: int
    copying: int
    total_score: int
    severity_level: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MMSESummary(BaseModel):
    latest_score: int
    severity_level: str
    total_tests: int
    history: list
