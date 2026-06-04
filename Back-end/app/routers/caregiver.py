"""Caregiver burnout assessment router."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.family_contact import FamilyContact
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


def _is_linked_family(user_id: int, patient_id: int, db: Session) -> bool:
    return db.query(FamilyContact).filter(
        FamilyContact.patient_id == patient_id,
        FamilyContact.user_id == user_id,
    ).first() is not None


def _is_assigned_doctor(user_id: int, patient_id: int, db: Session) -> bool:
    doc = db.query(Doctor).filter(Doctor.user_id == user_id).first()
    if not doc:
        return False
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    return patient is not None and patient.assigned_doctor_id == doc.id


@router.post("/submit", response_model=CaregiverAssessmentOut)
def submit_assessment(
    data: CaregiverAssessmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only FAMILY members who are linked to this patient may submit
    if current_user.role != UserRole.FAMILY:
        raise HTTPException(status_code=403, detail="يُسمح فقط لأفراد عائلة المريض بإرسال هذا التقييم")

    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="المريض غير موجود")

    if not _is_linked_family(current_user.id, data.patient_id, db):
        raise HTTPException(status_code=403, detail="لا يحق لك إرسال تقييم لهذا المريض — تأكد أنك مسجّل كجهة تواصل عائلية")

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
    if current_user.role == UserRole.ADMIN:
        # Admin sees all assessments for the patient
        records = (
            db.query(CaregiverAssessment)
            .filter(CaregiverAssessment.patient_id == patient_id)
            .order_by(CaregiverAssessment.created_at.desc())
            .all()
        )
    elif current_user.role == UserRole.DOCTOR:
        if not _is_assigned_doctor(current_user.id, patient_id, db):
            raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")
        records = (
            db.query(CaregiverAssessment)
            .filter(CaregiverAssessment.patient_id == patient_id)
            .order_by(CaregiverAssessment.created_at.desc())
            .all()
        )
    elif current_user.role == UserRole.FAMILY:
        if not _is_linked_family(current_user.id, patient_id, db):
            raise HTTPException(status_code=403, detail="لا يحق لك الوصول لبيانات هذا المريض")
        records = (
            db.query(CaregiverAssessment)
            .filter(
                CaregiverAssessment.patient_id == patient_id,
                CaregiverAssessment.user_id == current_user.id,
            )
            .order_by(CaregiverAssessment.created_at.desc())
            .all()
        )
    else:
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    return [_build_out(r) for r in records]


@router.get("/latest/{patient_id}", response_model=CaregiverAssessmentOut)
def latest_assessment(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.ADMIN:
        record = (
            db.query(CaregiverAssessment)
            .filter(CaregiverAssessment.patient_id == patient_id)
            .order_by(CaregiverAssessment.created_at.desc())
            .first()
        )
    elif current_user.role == UserRole.DOCTOR:
        if not _is_assigned_doctor(current_user.id, patient_id, db):
            raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")
        record = (
            db.query(CaregiverAssessment)
            .filter(CaregiverAssessment.patient_id == patient_id)
            .order_by(CaregiverAssessment.created_at.desc())
            .first()
        )
    elif current_user.role == UserRole.FAMILY:
        if not _is_linked_family(current_user.id, patient_id, db):
            raise HTTPException(status_code=403, detail="لا يحق لك الوصول لبيانات هذا المريض")
        record = (
            db.query(CaregiverAssessment)
            .filter(
                CaregiverAssessment.patient_id == patient_id,
                CaregiverAssessment.user_id == current_user.id,
            )
            .order_by(CaregiverAssessment.created_at.desc())
            .first()
        )
    else:
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    if not record:
        raise HTTPException(status_code=404, detail="لا يوجد تقييم لهذا المريض")
    return _build_out(record)
