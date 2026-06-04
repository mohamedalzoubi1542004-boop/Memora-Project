"""Games router — submit session, get history and stats."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.game_session import GameSession
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.user import User, UserRole
from app.schemas.game_schema import GameSessionCreate, GameSessionOut, GameStatsOut
from app.utils.deps import get_current_user

router = APIRouter(prefix="/games", tags=["Games"])

VALID_GAME_TYPES = {"sequence", "cards", "words", "pattern", "tasks", "faces"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def _get_patient(user: User, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "هذا الحساب ليس حساب مريض")
    return patient


def _assert_can_view_patient_games(current_user: User, patient: Patient, db: Session) -> None:
    """Raise unless current_user may view this patient's game data."""
    if current_user.role == UserRole.ADMIN:
        return
    if current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or patient.assigned_doctor_id != doctor.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "هذا المريض غير مسجل تحت إشرافك")
        return
    if current_user.role == UserRole.PATIENT and patient.user_id == current_user.id:
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, "غير مصرح بالوصول")


@router.post("/submit", response_model=GameSessionOut, status_code=status.HTTP_201_CREATED)
def submit_game(
    data: GameSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.game_type not in VALID_GAME_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"نوع اللعبة غير صالح: {data.game_type}")
    if data.difficulty not in VALID_DIFFICULTIES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"مستوى الصعوبة غير صالح: {data.difficulty}")

    patient = _get_patient(current_user, db)

    session = GameSession(
        patient_id=patient.id,
        game_type=data.game_type,
        difficulty=data.difficulty,
        score=data.score,
        level_reached=data.level_reached,
        time_seconds=data.time_seconds,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/history", response_model=List[GameSessionOut])
def get_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = _get_patient(current_user, db)
    sessions = (
        db.query(GameSession)
        .filter(GameSession.patient_id == patient.id)
        .order_by(GameSession.created_at.desc())
        .limit(limit)
        .all()
    )
    return sessions


@router.get("/patient/{patient_id}/stats")
def get_patient_stats_for_doctor(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Doctor endpoint — get game stats for a specific patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المريض غير موجود")
    _assert_can_view_patient_games(current_user, patient, db)
    sessions = db.query(GameSession).filter(GameSession.patient_id == patient_id).all()
    return _build_stats(sessions)


def _build_stats(sessions: list) -> dict:
    if not sessions:
        return {"total_sessions": 0, "average_score": 0, "best_scores": {}, "by_game": {}}

    by_game: dict[str, list[int]] = {}
    for s in sessions:
        by_game.setdefault(s.game_type, []).append(s.score)

    return {
        "total_sessions": len(sessions),
        "average_score": round(sum(s.score for s in sessions) / len(sessions), 1),
        "best_scores": {g: max(scores) for g, scores in by_game.items()},
        "by_game": {
            g: {
                "count": len(scores),
                "best": max(scores),
                "average": round(sum(scores) / len(scores), 1),
            }
            for g, scores in by_game.items()
        },
    }


@router.get("/by-type/{patient_id}/{game_type}", response_model=List[GameSessionOut])
def get_by_type(
    patient_id: int,
    game_type: str,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return sessions of a specific game type for a patient (doctor/admin/self)."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المريض غير موجود")
    _assert_can_view_patient_games(current_user, patient, db)
    if game_type not in VALID_GAME_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"نوع اللعبة غير صالح: {game_type}")

    sessions = (
        db.query(GameSession)
        .filter(GameSession.patient_id == patient_id, GameSession.game_type == game_type)
        .order_by(GameSession.created_at.desc())
        .limit(limit)
        .all()
    )
    return sessions


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = _get_patient(current_user, db)
    sessions = db.query(GameSession).filter(GameSession.patient_id == patient.id).all()
    return _build_stats(sessions)
