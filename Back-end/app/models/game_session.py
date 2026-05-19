"""Game Session model — records a single cognitive-game play result."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base

# Supported game types (kept as plain strings so mobile can add new types freely)
GAME_TYPES = ("sequence", "cards", "words", "pattern", "tasks", "faces")


class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    game_type = Column(String, nullable=False)   # one of GAME_TYPES
    difficulty = Column(String, default="medium")
    score = Column(Integer, nullable=False)
    level_reached = Column(Integer)
    time_seconds = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
