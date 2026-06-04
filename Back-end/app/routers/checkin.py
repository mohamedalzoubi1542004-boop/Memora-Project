"""Daily check-in router — mood tracking for patients."""

from datetime import date, datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.daily_checkin import DailyCheckin, MOOD_CHOICES
from app.schemas.checkin_schema import CheckinCreate, CheckinOut
from app.utils.deps import get_current_user

router = APIRouter(prefix="/checkin", tags=["checkin"])


def _require_patient(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="المرضى فقط")
    return current_user


@router.post("", response_model=CheckinOut)
def submit_checkin(
    data: CheckinCreate,
    current_user: User = Depends(_require_patient),
    db: Session = Depends(get_db),
):
    if data.mood not in MOOD_CHOICES:
        raise HTTPException(status_code=400, detail=f"قيمة المزاج غير صالحة — المقبول: {MOOD_CHOICES}")

    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف المريض")

    today = date.today().isoformat()
    existing = (
        db.query(DailyCheckin)
        .filter(
            DailyCheckin.patient_id == patient.id,
            func.date(DailyCheckin.created_at) == today,
        )
        .first()
    )
    if existing:
        existing.mood = data.mood
        db.commit()
        db.refresh(existing)
        return existing

    checkin = DailyCheckin(patient_id=patient.id, mood=data.mood)
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return checkin


@router.get("/history", response_model=List[CheckinOut])
def checkin_history(
    current_user: User = Depends(_require_patient),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []

    records = (
        db.query(DailyCheckin)
        .filter(DailyCheckin.patient_id == patient.id)
        .order_by(DailyCheckin.created_at.desc())
        .limit(30)
        .all()
    )
    return records


@router.get("/patient/{patient_id}", response_model=List[CheckinOut])
def patient_checkins(
    patient_id: int,
    limit: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.DOCTOR, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    records = (
        db.query(DailyCheckin)
        .filter(DailyCheckin.patient_id == patient_id)
        .order_by(DailyCheckin.created_at.desc())
        .limit(limit)
        .all()
    )
    return records


@router.get("/today", response_model=CheckinOut | None)
def today_checkin(
    current_user: User = Depends(_require_patient),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return None

    today = date.today().isoformat()
    record = (
        db.query(DailyCheckin)
        .filter(
            DailyCheckin.patient_id == patient.id,
            func.date(DailyCheckin.created_at) == today,
        )
        .first()
    )
    return record
