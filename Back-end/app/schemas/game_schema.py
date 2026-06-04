from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Optional


class GameSessionCreate(BaseModel):
    game_type: str              # sequence | cards | words | pattern | tasks | faces
    score: int = Field(..., ge=0, le=10_000)
    level_reached: int = Field(..., ge=0)
    time_seconds: int = Field(..., ge=0)
    difficulty: str = "medium"  # easy | medium | hard (optional, defaults to medium)

    @model_validator(mode="after")
    def _coherent_session(self) -> "GameSessionCreate":
        # A real game session cannot produce progress in zero time
        if self.time_seconds == 0 and (self.score > 0 or self.level_reached > 0):
            raise ValueError("جلسة غير صالحة — لا يمكن تحقيق نتيجة في وقت صفر")
        return self


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
