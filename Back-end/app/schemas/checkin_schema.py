from datetime import datetime
from pydantic import BaseModel


class CheckinCreate(BaseModel):
    mood: str   # great / ok / not_good


class CheckinOut(BaseModel):
    id: int
    patient_id: int
    mood: str
    created_at: datetime

    model_config = {"from_attributes": True}
