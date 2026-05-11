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
        raise HTTPException(status_code=403, detail="Patients only")

    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id, Doctor.is_approved == True).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found or not approved")

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=data.doctor_id,
        scheduled_at=data.scheduled_at,
        notes=data.notes,
        status=AppointmentStatus.pending,
    )
    db.add(appt)
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
        raise HTTPException(status_code=403, detail="Access denied")

    return [_build_out(a, db) for a in appts]


@router.post("/{appt_id}/approve", response_model=AppointmentOut)
def approve_appointment(
    appt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Doctors only")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    appt = db.query(Appointment).filter(
        Appointment.id == appt_id, Appointment.doctor_id == doctor.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = AppointmentStatus.approved

    # Auto-assign patient to this doctor on first appointment approval
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
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or appt.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or appt.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    appt.status = AppointmentStatus.cancelled
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
        raise HTTPException(status_code=403, detail="Doctors only")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    appt = db.query(Appointment).filter(
        Appointment.id == appt_id, Appointment.doctor_id == doctor.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = AppointmentStatus.completed
    db.commit()
    db.refresh(appt)
    return _build_out(appt, db)
