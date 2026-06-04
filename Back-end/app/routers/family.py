"""Family router — add/list/delete family contacts, view patient summary."""

from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.family_contact import FamilyContact
from app.models.diagnosis import Diagnosis
from app.models.mmse_result import MMSEResult
from app.models.symptom_entry import SymptomEntry
from app.models.daily_checkin import DailyCheckin
from app.models.appointment import Appointment, AppointmentStatus
from app.models.game_session import GameSession
from app.schemas.family_schema import FamilyContactCreate, FamilyContactOut
from app.services.risk_service import compute_risk
from app.utils.deps import get_current_user

router = APIRouter(prefix="/family", tags=["family"])


def _is_family_contact_of(user_id: int, patient_id: int, db: Session) -> bool:
    """Return True if this user_id is registered as a family contact of patient_id."""
    return db.query(FamilyContact).filter(
        FamilyContact.patient_id == patient_id,
        FamilyContact.user_id == user_id,
    ).first() is not None


def _is_assigned_doctor_of(user_id: int, patient_id: int, db: Session) -> bool:
    """Return True if this user is the doctor assigned to patient_id."""
    doctor = db.query(Doctor).filter(Doctor.user_id == user_id).first()
    if not doctor:
        return False
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    return patient is not None and patient.assigned_doctor_id == doctor.id


def _assert_patient_access(current_user: User, patient_id: int, db: Session):
    """Raise 403 unless current_user has a legitimate reason to view this patient."""
    if current_user.role == UserRole.ADMIN:
        return
    if current_user.role == UserRole.DOCTOR:
        if not _is_assigned_doctor_of(current_user.id, patient_id, db):
            raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")
        return
    if current_user.role == UserRole.FAMILY:
        if not _is_family_contact_of(current_user.id, patient_id, db):
            raise HTTPException(status_code=403, detail="لا يحق لك الوصول لبيانات هذا المريض")
        return
    if current_user.role == UserRole.PATIENT:
        own = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not own or own.id != patient_id:
            raise HTTPException(status_code=403, detail="غير مصرح بالوصول")
        return
    raise HTTPException(status_code=403, detail="غير مصرح بالوصول")


@router.post("/contacts", response_model=FamilyContactOut)
def add_contact(
    data: FamilyContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="المريض غير موجود")

    # Only the patient themselves, their assigned doctor, or an admin may add
    # a family contact. A FAMILY user must NOT be able to self-attach to anyone.
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.DOCTOR:
        if not _is_assigned_doctor_of(current_user.id, data.patient_id, db):
            raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")
    elif current_user.role == UserRole.PATIENT:
        if patient.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="يمكنك إضافة جهات تواصل لحسابك فقط")
    else:
        raise HTTPException(status_code=403, detail="غير مصرح لك بإضافة جهات تواصل")

    # Link to an existing FAMILY account only by verified email match
    linked_user_id: int | None = None
    if data.email:
        existing = db.query(User).filter(
            User.email == data.email,
            User.role == UserRole.FAMILY,
        ).first()
        linked_user_id = existing.id if existing else None

    contact = FamilyContact(
        patient_id=data.patient_id,
        user_id=linked_user_id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        relation_type=data.relation_type,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/contacts/patient/{patient_id}", response_model=List[FamilyContactOut])
def list_contacts(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id, db)
    contacts = db.query(FamilyContact).filter(FamilyContact.patient_id == patient_id).all()
    return contacts


@router.delete("/contacts/{contact_id}")
def delete_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contact = db.query(FamilyContact).filter(FamilyContact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="جهة التواصل غير موجودة")

    if current_user.role == UserRole.ADMIN:
        pass  # allowed
    elif current_user.role == UserRole.DOCTOR:
        # Doctor may only remove contacts for their own assigned patients
        if not _is_assigned_doctor_of(current_user.id, contact.patient_id, db):
            raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")
    else:
        # Family or patient: can only delete their own contact entry
        if contact.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted"}


@router.get("/my-patients")
def my_linked_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all patients this FAMILY user is a contact of."""
    if current_user.role != UserRole.FAMILY:
        raise HTTPException(status_code=403, detail="هذه الميزة متاحة لأفراد العائلة فقط")

    contacts = db.query(FamilyContact).filter(
        FamilyContact.user_id == current_user.id
    ).all()

    result = []
    for c in contacts:
        patient = db.query(Patient).filter(Patient.id == c.patient_id).first()
        if patient:
            patient_user = db.query(User).filter(User.id == patient.user_id).first()
            result.append({
                "patient_id": patient.id,
                "full_name": patient_user.full_name if patient_user else "",
                "relation_type": c.relation_type,
            })
    return result


@router.get("/patient/{patient_id}/summary")
def patient_summary(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Family view — read-only patient summary with risk assessment."""
    _assert_patient_access(current_user, patient_id, db)

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="المريض غير موجود")

    patient_user = db.query(User).filter(User.id == patient.user_id).first()

    # Family sees only diagnoses the doctor has reviewed & approved
    latest_diag = (
        db.query(Diagnosis)
        .filter(
            Diagnosis.patient_id == patient_id,
            Diagnosis.status == "completed",
        )
        .order_by(Diagnosis.created_at.desc())
        .first()
    )
    latest_mmse = (
        db.query(MMSEResult)
        .filter(MMSEResult.patient_id == patient_id)
        .order_by(MMSEResult.created_at.desc())
        .first()
    )
    latest_symptoms = (
        db.query(SymptomEntry)
        .filter(SymptomEntry.patient_id == patient_id)
        .order_by(SymptomEntry.created_at.desc())
        .first()
    )

    risk = compute_risk(
        mri_classification=latest_diag.classification if latest_diag else None,
        mmse_score=latest_mmse.total_score if latest_mmse else None,
        symptom_score=latest_symptoms.total_score if latest_symptoms else None,
    )

    week_ago = date.today() - timedelta(days=6)
    checkins_raw = (
        db.query(DailyCheckin)
        .filter(
            DailyCheckin.patient_id == patient_id,
            DailyCheckin.created_at >= week_ago,
        )
        .order_by(DailyCheckin.created_at.asc())
        .all()
    )
    daily_checkins = [
        {"mood": c.mood, "date": c.created_at.isoformat()} for c in checkins_raw
    ]

    upcoming = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.status == AppointmentStatus.APPROVED,
        )
        .order_by(Appointment.scheduled_at.asc())
        .limit(3)
        .all()
    )
    appointments_out = [
        {"scheduled_at": a.scheduled_at.isoformat(), "notes": a.notes}
        for a in upcoming
    ]

    game_sessions = (
        db.query(GameSession)
        .filter(GameSession.patient_id == patient_id)
        .all()
    )
    total_game_sessions = len(game_sessions)
    avg_game_score = (
        round(sum(g.score for g in game_sessions) / total_game_sessions)
        if total_game_sessions > 0 else None
    )

    return {
        "patient": {
            "id": patient.id,
            "full_name": patient_user.full_name if patient_user else "",
            "gender": patient.gender,
            "date_of_birth": str(patient.date_of_birth) if patient.date_of_birth else None,
        },
        "latest_diagnosis": {
            "classification": latest_diag.classification if latest_diag else None,
            "confidence": latest_diag.confidence if latest_diag else None,
            "date": latest_diag.created_at.isoformat() if latest_diag else None,
        },
        "mmse": {
            "score": latest_mmse.total_score if latest_mmse else None,
            "severity": latest_mmse.severity_level if latest_mmse else None,
        },
        "symptoms": {
            "score": latest_symptoms.total_score if latest_symptoms else None,
            "severity": latest_symptoms.severity_level if latest_symptoms else None,
        },
        "risk": risk,
        "daily_checkins": daily_checkins,
        "upcoming_appointments": appointments_out,
        "game_stats": {
            "total_sessions": total_game_sessions,
            "avg_score": avg_game_score,
        },
    }
