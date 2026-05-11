from typing import Optional
from pydantic import BaseModel


class FamilyContactCreate(BaseModel):
    patient_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    relation_type: Optional[str] = None


class FamilyContactOut(BaseModel):
    id: int
    patient_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    relation_type: Optional[str] = None

    model_config = {"from_attributes": True}
