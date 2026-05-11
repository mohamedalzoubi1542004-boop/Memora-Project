"""Caregiver Assessment model — burnout/stress questionnaire completed by the caregiver."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.types import JSON
from sqlalchemy.sql import func

from app.database import Base


class CaregiverAssessment(Base):
    __tablename__ = "caregiver_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)    # caregiver's account
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)

    scores = Column(JSON, nullable=False)           # {"q1": 2, "q2": 1, ...}
    total_score = Column(Integer, nullable=False)
    burnout_level = Column(String, nullable=False)  # low / moderate / high

    created_at = Column(DateTime(timezone=True), server_default=func.now())
