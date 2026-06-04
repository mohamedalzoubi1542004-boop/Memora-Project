"""Appointments router — request, approve, cancel, complete."""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.appointment import Appointment, AppointmentStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.schemas.appointment_schema import AppointmentCreate, AppointmentOut
from app.utils.deps import get_current_user

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _build_out(appt: Appointment, db: Session) -> AppointmentOut:
    patient_user = db.query(User).join(Patient, Patient.user_id == User.id).filter(
        Patient.id == appt.patient_id
    ).first()
    doctor_user = db.query(User).join(Doctor, Doctor.user_id == User.id).filter(
        Doctor.id == appt.doctor_id
    ).first()
    return AppointmentOut(
        id=appt.id,
        patient_id=appt.patient_id,
        doctor_id=appt.doctor_id,
        scheduled_at=appt.scheduled_at,
        status=appt.status.value,
        notes=appt.notes,
        patient_name=patient_user.full_name if patient_user else "",
        doctor_name=doctor_user.full_name if doctor_user else "",
        created_at=appt.created_at,
    )


@router.post("", response_model=AppointmentOut)
def request_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="المرضى فقط")

    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف المريض")

    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id, Doctor.is_approved == True).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="الطبيب غير موجود أو لم يُوافق على حسابه بعد")

    # A patient already under another doctor must unassign before booking elsewhere
    if patient.assigned_doctor_id is not None and patient.assigned_doctor_id != data.doctor_id:
        raise HTTPException(
            status_code=403,
            detail="أنت مسجّل حالياً تحت إشراف طبيب آخر — ألغِ ارتباطك به أولاً",
        )

    # The appointment must be in the future
    now = datetime.now(data.scheduled_at.tzinfo)
    if data.scheduled_at <= now:
        raise HTTPException(status_code=422, detail="لا يمكن حجز موعد في وقت ماضٍ")

    # Reject a clashing slot — the doctor already has an active appointment then
    clash = db.query(Appointment).filter(
        Appointment.doctor_id == data.doctor_id,
        Appointment.scheduled_at == data.scheduled_at,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.APPROVED]),
    ).first()
    if clash:
        raise HTTPException(status_code=409, detail="هذا الموعد محجوز مسبقاً — اختر وقتاً آخر")

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=data.doctor_id,
        scheduled_at=data.scheduled_at,
        notes=data.notes,
        status=AppointmentStatus.PENDING,
    )
    db.add(appt)
    # NOTE: assignment to the doctor happens on approval, not on request —
    # a pending request is not yet a care relationship.
    db.commit()
    db.refresh(appt)
    return _build_out(appt, db)


@router.get("/my", response_model=List[AppointmentOut])
def my_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        appts = db.query(Appointment).filter(Appointment.patient_id == patient.id).all()
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return []
        appts = db.query(Appointment).filter(Appointment.doctor_id == doctor.id).all()
    else:
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    return [_build_out(a, db) for a in appts]


@router.post("/{appt_id}/approve", response_model=AppointmentOut)
def approve_appointment(
    appt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="الأطباء فقط")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    appt = db.query(Appointment).filter(
        Appointment.id == appt_id, Appointment.doctor_id == doctor.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="الموعد غير موجود")

    if appt.status != AppointmentStatus.PENDING:
        raise HTTPException(status_code=400, detail="لا يمكن اعتماد إلا موعد معلّق")

    appt.status = AppointmentStatus.APPROVED
    # Approval establishes the care relationship — assign the patient if free
    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    if patient and patient.assigned_doctor_id is None:
        patient.assigned_doctor_id = doctor.id

    db.commit()
    db.refresh(appt)
    return _build_out(appt, db)


@router.post("/{appt_id}/cancel", response_model=AppointmentOut)
def cancel_appointment(
    appt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="الموعد غير موجود")

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or appt.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="غير مصرح بالوصول")
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or appt.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="غير مصرح بالوصول")
    else:
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    if appt.status not in (AppointmentStatus.PENDING, AppointmentStatus.APPROVED):
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء موعد منتهٍ أو ملغى مسبقاً")

    appt.status = AppointmentStatus.CANCELLED
    db.commit()
    db.refresh(appt)
    return _build_out(appt, db)


@router.post("/{appt_id}/complete", response_model=AppointmentOut)
def complete_appointment(
    appt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="الأطباء فقط")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    appt = db.query(Appointment).filter(
        Appointment.id == appt_id, Appointment.doctor_id == doctor.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="الموعد غير موجود")

    if appt.status != AppointmentStatus.APPROVED:
        raise HTTPException(status_code=400, detail="لا يمكن إكمال إلا موعد معتمد")

    appt.status = AppointmentStatus.COMPLETED
    db.commit()
    db.refresh(appt)
    return _build_out(appt, db)
