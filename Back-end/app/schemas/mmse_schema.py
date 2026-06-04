from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class MMSECreate(BaseModel):
    # Every domain is required — a partial/blank submission must be rejected,
    # not silently scored as 0 (which would read as "severe").
    patient_id: int
    temporal_orientation:   int = Field(..., ge=0, le=5)
    spatial_orientation:    int = Field(..., ge=0, le=5)
    registration:           int = Field(..., ge=0, le=3)
    attention_calculation:  int = Field(..., ge=0, le=5)
    recall:                 int = Field(..., ge=0, le=3)
    naming:                 int = Field(..., ge=0, le=2)
    repetition:             int = Field(..., ge=0, le=1)
    three_stage_command:    int = Field(..., ge=0, le=3)
    reading:                int = Field(..., ge=0, le=1)
    writing:                int = Field(..., ge=0, le=1)
    copying:                int = Field(..., ge=0, le=1)


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
