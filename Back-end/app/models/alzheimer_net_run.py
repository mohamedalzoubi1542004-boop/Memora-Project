"""AlzheimerNetRun — audit log for every AI inference call."""

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class AlzheimerNetRun(Base):
    __tablename__ = "alzheimer_net_runs"

    id = Column(Integer, primary_key=True, index=True)
    diagnosis_id = Column(Integer, ForeignKey("diagnoses.id", ondelete="CASCADE"), nullable=False)
    model_version = Column(String(50), nullable=False, default="alzheimernet-v1")
    inference_time_ms = Column(Integer, nullable=False)
    temperature = Column(Float, nullable=False, default=1.0)
    tta_passes = Column(Integer, nullable=False, default=1)
    ensemble_size = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
