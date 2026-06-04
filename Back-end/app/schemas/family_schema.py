from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

VALID_RELATIONS = {"son", "daughter", "father", "mother", "brother", "sister", "spouse", "other"}


class FamilyContactCreate(BaseModel):
    patient_id: int
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    relation_type: Optional[str] = None

    @field_validator("name")
    @classmethod
    def _name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("الاسم لا يمكن أن يكون فارغاً")
        return v.strip()

    @field_validator("relation_type")
    @classmethod
    def _valid_relation(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_RELATIONS:
            raise ValueError(f"صلة القرابة غير صالحة — المقبول: {', '.join(sorted(VALID_RELATIONS))}")
        return v


class FamilyContactOut(BaseModel):
    id: int
    patient_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    relation_type: Optional[str] = None

    model_config = {"from_attributes": True}
