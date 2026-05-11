"""Symptoms router — submit questionnaire, history, latest."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.symptom_entry import SymptomEntry
from app.schemas.symptom_schema import SymptomCreate, SymptomOut, SymptomSummary
from app.utils.deps import get_current_user

router = APIRouter(prefix="/symptoms", tags=["symptoms"])


def _severity(score: int) -> str:
    if score <= 6:
        return "minimal"
    if score <= 14:
        return "moderate"
    return "high"


def _build_out(e: SymptomEntry) -> SymptomOut:
    return SymptomOut(
        id=e.id,
        patient_id=e.patient_id,
        scores=e.scores,
        total_score=e.total_score,
        severity_level=e.severity_level,
        created_at=e.created_at,
    )


@router.post("/submit", response_model=SymptomOut)
def submit_symptoms(
    data: SymptomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.PATIENT, UserRole.DOCTOR, UserRole.FAMILY):
        raise HTTPException(status_code=403, detail="Access denied")

    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    total = sum(data.scores.values())
    entry = SymptomEntry(
        patient_id=data.patient_id,
        scores=data.scores,
        total_score=total,
        severity_level=_severity(total),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _build_out(entry)


@router.get("/patient/{patient_id}", response_model=List[SymptomOut])
def patient_history(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(SymptomEntry)
        .filter(SymptomEntry.patient_id == patient_id)
        .order_by(SymptomEntry.created_at.desc())
        .all()
    )
    return [_build_out(r) for r in records]


@router.get("/patient/{patient_id}/latest", response_model=SymptomOut)
def latest_symptoms(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(SymptomEntry)
        .filter(SymptomEntry.patient_id == patient_id)
        .order_by(SymptomEntry.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="No symptom entry found")
    return _build_out(record)


@router.get("/patient/{patient_id}/summary", response_model=SymptomSummary)
def symptom_summary(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(SymptomEntry)
        .filter(SymptomEntry.patient_id == patient_id)
        .order_by(SymptomEntry.created_at.desc())
        .limit(6)
        .all()
    )
    if not records:
        raise HTTPException(status_code=404, detail="No symptom records found")

    latest = records[0]
    return SymptomSummary(
        latest_score=latest.total_score,
        severity_level=latest.severity_level,
        total_entries=len(records),
        history=[{"score": r.total_score, "date": r.created_at.isoformat()} for r in records],
    )
