from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class GameSessionCreate(BaseModel):
    game_type: str              # sequence | cards | words | pattern | tasks | faces
    score: int
    level_reached: int
    time_seconds: int
    difficulty: str = "medium"  # easy | medium | hard (optional, defaults to medium)


class GameSessionOut(BaseModel):
    id: int
    patient_id: int
    game_type: str
    score: int
    level_reached: int
    time_seconds: int
    created_at: datetime

    class Config:
        from_attributes = True


class GameStatsOut(BaseModel):
    total_sessions: int
    average_score: float
    best_scores: dict
    by_game: dict
