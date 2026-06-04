from datetime import datetime
from typing import Dict
from pydantic import BaseModel, model_validator

SYMPTOM_KEYS = {f"q{i}" for i in range(1, 13)}   # q1 … q12


class SymptomCreate(BaseModel):
    patient_id: int
    scores: Dict[str, int]   # {"q1": 0|1|2, ..., "q12": 0|1|2}

    @model_validator(mode="after")
    def _validate_scores(self) -> "SymptomCreate":
        keys = set(self.scores.keys())
        if keys != SYMPTOM_KEYS:
            missing = SYMPTOM_KEYS - keys
            extra   = keys - SYMPTOM_KEYS
            detail  = []
            if missing:
                detail.append(f"أسئلة ناقصة: {sorted(missing)}")
            if extra:
                detail.append(f"أسئلة غير معروفة: {sorted(extra)}")
            raise ValueError(" — ".join(detail))
        bad = [k for k, v in self.scores.items() if v not in (0, 1, 2)]
        if bad:
            raise ValueError(f"قيم غير صالحة في: {sorted(bad)} — المقبول فقط 0 أو 1 أو 2")
        return self


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
