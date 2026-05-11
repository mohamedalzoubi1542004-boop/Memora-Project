"""Caregiver burnout assessment router."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.caregiver_assessment import CaregiverAssessment
from app.schemas.caregiver_schema import CaregiverAssessmentCreate, CaregiverAssessmentOut
from app.utils.deps import get_current_user

router = APIRouter(prefix="/caregiver", tags=["caregiver"])


def _burnout_level(score: int) -> str:
    if score <= 6:
        return "low"
    if score <= 13:
        return "moderate"
    return "high"


def _build_out(a: CaregiverAssessment) -> CaregiverAssessmentOut:
    return CaregiverAssessmentOut(
        id=a.id,
        user_id=a.user_id,
        patient_id=a.patient_id,
        scores=a.scores,
        total_score=a.total_score,
        burnout_level=a.burnout_level,
        created_at=a.created_at,
    )


@router.post("/submit", response_model=CaregiverAssessmentOut)
def submit_assessment(
    data: CaregiverAssessmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    total = sum(data.scores.values())
    assessment = CaregiverAssessment(
        user_id=current_user.id,
        patient_id=data.patient_id,
        scores=data.scores,
        total_score=total,
        burnout_level=_burnout_level(total),
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return _build_out(assessment)


@router.get("/history/{patient_id}", response_model=List[CaregiverAssessmentOut])
def assessment_history(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(CaregiverAssessment)
        .filter(
            CaregiverAssessment.patient_id == patient_id,
            CaregiverAssessment.user_id == current_user.id,
        )
        .order_by(CaregiverAssessment.created_at.desc())
        .all()
    )
    return [_build_out(r) for r in records]


@router.get("/latest/{patient_id}", response_model=CaregiverAssessmentOut)
def latest_assessment(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(CaregiverAssessment)
        .filter(
            CaregiverAssessment.patient_id == patient_id,
            CaregiverAssessment.user_id == current_user.id,
        )
        .order_by(CaregiverAssessment.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="No assessment found")
    return _build_out(record)
