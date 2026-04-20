"""Daily Check-in model — patient self-reported mood once per day."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base

MOOD_CHOICES = ("great", "ok", "not_good")


class DailyCheckin(Base):
    __tablename__ = "daily_checkins"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    mood = Column(String, nullable=False)   # one of MOOD_CHOICES
    created_at = Column(DateTime(timezone=True), server_default=func.now())
