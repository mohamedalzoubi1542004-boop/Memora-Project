"""Symptoms router — submit questionnaire, history, latest."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.family_contact import FamilyContact
from app.models.symptom_entry import SymptomEntry
from app.schemas.symptom_schema import SymptomCreate, SymptomOut, SymptomSummary
from app.utils.deps import get_current_user

router = APIRouter(prefix="/symptoms", tags=["symptoms"])


def _assert_read_access(current_user: User, patient_id: int, db: Session) -> None:
    """Raise 403 unless the caller is allowed to read this patient's symptom data."""
    if current_user.role == UserRole.ADMIN:
        return
    if current_user.role == UserRole.DOCTOR:
        doc = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not doc or not patient or patient.assigned_doctor_id != doc.id:
            raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")
        return
    if current_user.role == UserRole.PATIENT:
        own = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not own or own.id != patient_id:
            raise HTTPException(status_code=403, detail="يمكنك عرض سجلاتك الخاصة فقط")
        return
    if current_user.role == UserRole.FAMILY:
        linked = db.query(FamilyContact).filter(
            FamilyContact.patient_id == patient_id,
            FamilyContact.user_id == current_user.id,
        ).first()
        if not linked:
            raise HTTPException(status_code=403, detail="لا يحق لك الوصول لبيانات هذا المريض")
        return
    raise HTTPException(status_code=403, detail="غير مصرح بالوصول")


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
    # Symptoms are observation-based — reported by a caregiver (family) or the
    # treating doctor, never self-reported by the patient.
    if current_user.role not in (UserRole.DOCTOR, UserRole.FAMILY):
        raise HTTPException(status_code=403, detail="تسجيل الأعراض متاح لمقدّم الرعاية أو الطبيب فقط")

    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="المريض غير موجود")

    # DOCTOR: must be approved, not suspended, and assigned to this patient
    if current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="لم يُعثر على ملف الطبيب")
        if not doctor.is_approved:
            raise HTTPException(status_code=403, detail="حسابك لم يُوافق عليه بعد من قِبل المدير")
        if doctor.is_suspended:
            raise HTTPException(status_code=403, detail="حسابك موقوف — يرجى التواصل مع الإدارة")
        if patient.assigned_doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")

    # FAMILY: must be a registered contact for this patient
    elif current_user.role == UserRole.FAMILY:
        is_contact = db.query(FamilyContact).filter(
            FamilyContact.patient_id == data.patient_id,
            FamilyContact.user_id == current_user.id,
        ).first()
        if not is_contact:
            raise HTTPException(status_code=403, detail="لا يحق لك تسجيل أعراض لهذا المريض")

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
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_read_access(current_user, patient_id, db)
    limit = min(limit, 100)
    records = (
        db.query(SymptomEntry)
        .filter(SymptomEntry.patient_id == patient_id)
        .order_by(SymptomEntry.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_build_out(r) for r in records]


@router.get("/patient/{patient_id}/latest", response_model=SymptomOut)
def latest_symptoms(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_read_access(current_user, patient_id, db)
    record = (
        db.query(SymptomEntry)
        .filter(SymptomEntry.patient_id == patient_id)
        .order_by(SymptomEntry.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="لا توجد تسجيلات أعراض لهذا المريض")
    return _build_out(record)


@router.get("/patient/{patient_id}/summary", response_model=SymptomSummary)
def symptom_summary(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_read_access(current_user, patient_id, db)
    records = (
        db.query(SymptomEntry)
        .filter(SymptomEntry.patient_id == patient_id)
        .order_by(SymptomEntry.created_at.desc())
        .limit(6)
        .all()
    )
    if not records:
        raise HTTPException(status_code=404, detail="لا توجد سجلات أعراض لهذا المريض")

    latest = records[0]
    return SymptomSummary(
        latest_score=latest.total_score,
        severity_level=latest.severity_level,
        total_entries=len(records),
        history=[{"score": r.total_score, "date": r.created_at.isoformat()} for r in records],
    )
