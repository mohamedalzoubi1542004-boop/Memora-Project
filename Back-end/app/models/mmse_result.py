"""MMSE Result model — stores the 11-domain cognitive test scores (total 0-30)."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class MMSEResult(Base):
    __tablename__ = "mmse_results"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)

    # Domain scores (matches standard MMSE breakdown)
    temporal_orientation = Column(Integer, default=0)   # 0-5
    spatial_orientation = Column(Integer, default=0)    # 0-5
    registration = Column(Integer, default=0)           # 0-3
    attention_calculation = Column(Integer, default=0)  # 0-5
    recall = Column(Integer, default=0)                 # 0-3
    naming = Column(Integer, default=0)                 # 0-2
    repetition = Column(Integer, default=0)             # 0-1
    three_stage_command = Column(Integer, default=0)    # 0-3
    reading = Column(Integer, default=0)                # 0-1
    writing = Column(Integer, default=0)                # 0-1
    copying = Column(Integer, default=0)                # 0-1

    total_score = Column(Integer, nullable=False)       # 0-30 (sum of domains)
    severity_level = Column(String, nullable=False)     # normal / mild / severe

    created_at = Column(DateTime(timezone=True), server_default=func.now())
