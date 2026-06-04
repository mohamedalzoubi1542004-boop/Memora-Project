"""MMSE router — submit test, history, latest."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.mmse_result import MMSEResult
from app.models.family_contact import FamilyContact
from app.schemas.mmse_schema import MMSECreate, MMSEOut, MMSESummary
from app.utils.deps import get_current_user

router = APIRouter(prefix="/mmse", tags=["mmse"])


def _assert_read_access(current_user: User, patient_id: int, db: Session) -> None:
    """Raise 403 unless the caller is allowed to read this patient's MMSE data."""
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
    if score >= 24:
        return "normal"
    if score >= 18:
        return "mild"
    return "severe"


def _build_out(r: MMSEResult) -> MMSEOut:
    return MMSEOut(
        id=r.id,
        patient_id=r.patient_id,
        doctor_id=r.doctor_id,
        temporal_orientation=r.temporal_orientation,
        spatial_orientation=r.spatial_orientation,
        registration=r.registration,
        attention_calculation=r.attention_calculation,
        recall=r.recall,
        naming=r.naming,
        repetition=r.repetition,
        three_stage_command=r.three_stage_command,
        reading=r.reading,
        writing=r.writing,
        copying=r.copying,
        total_score=r.total_score,
        severity_level=r.severity_level,
        created_at=r.created_at,
    )


@router.post("/submit", response_model=MMSEOut)
def submit_mmse(
    data: MMSECreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.DOCTOR, UserRole.PATIENT):
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="المريض غير موجود")

    doctor_id = None
    if current_user.role == UserRole.DOCTOR:
        doc = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="لم يُعثر على ملف الطبيب")
        if not doc.is_approved:
            raise HTTPException(status_code=403, detail="حسابك لم يُوافق عليه بعد من قِبل المدير")
        if doc.is_suspended:
            raise HTTPException(status_code=403, detail="حسابك موقوف — يرجى التواصل مع الإدارة")
        if patient.assigned_doctor_id != doc.id:
            raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")
        doctor_id = doc.id

    elif current_user.role == UserRole.PATIENT:
        own = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not own or own.id != data.patient_id:
            raise HTTPException(status_code=403, detail="يمكنك تسجيل اختبارك الخاص فقط")

    total = (
        data.temporal_orientation
        + data.spatial_orientation
        + data.registration
        + data.attention_calculation
        + data.recall
        + data.naming
        + data.repetition
        + data.three_stage_command
        + data.reading
        + data.writing
        + data.copying
    )

    record = MMSEResult(
        patient_id=data.patient_id,
        doctor_id=doctor_id,
        temporal_orientation=data.temporal_orientation,
        spatial_orientation=data.spatial_orientation,
        registration=data.registration,
        attention_calculation=data.attention_calculation,
        recall=data.recall,
        naming=data.naming,
        repetition=data.repetition,
        three_stage_command=data.three_stage_command,
        reading=data.reading,
        writing=data.writing,
        copying=data.copying,
        total_score=total,
        severity_level=_severity(total),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _build_out(record)


@router.get("/patient/{patient_id}", response_model=List[MMSEOut])
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
        db.query(MMSEResult)
        .filter(MMSEResult.patient_id == patient_id)
        .order_by(MMSEResult.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_build_out(r) for r in records]


@router.get("/patient/{patient_id}/latest", response_model=MMSEOut)
def latest_mmse(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_read_access(current_user, patient_id, db)
    record = (
        db.query(MMSEResult)
        .filter(MMSEResult.patient_id == patient_id)
        .order_by(MMSEResult.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="لا توجد نتيجة MMSE لهذا المريض")
    return _build_out(record)


@router.get("/patient/{patient_id}/summary", response_model=MMSESummary)
def mmse_summary(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_read_access(current_user, patient_id, db)
    records = (
        db.query(MMSEResult)
        .filter(MMSEResult.patient_id == patient_id)
        .order_by(MMSEResult.created_at.desc())
        .limit(5)
        .all()
    )
    if not records:
        raise HTTPException(status_code=404, detail="لا توجد سجلات MMSE لهذا المريض")

    latest = records[0]
    return MMSESummary(
        latest_score=latest.total_score,
        severity_level=latest.severity_level,
        total_tests=len(records),
        history=[{"score": r.total_score, "date": r.created_at.isoformat()} for r in records],
    )
