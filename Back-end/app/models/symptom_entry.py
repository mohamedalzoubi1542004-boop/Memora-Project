"""Symptom Entry model — periodic caregiver/patient symptom questionnaire (12 items, 0-24)."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.types import JSON
from sqlalchemy.sql import func

from app.database import Base


class SymptomEntry(Base):
    __tablename__ = "symptom_entries"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)

    # {"q1": 0, "q2": 1, ..., "q12": 2}  — each answer 0/1/2
    scores = Column(JSON, nullable=False)
    total_score = Column(Integer, nullable=False)       # 0-24
    severity_level = Column(String, nullable=False)     # minimal / moderate / high

    created_at = Column(DateTime(timezone=True), server_default=func.now())
