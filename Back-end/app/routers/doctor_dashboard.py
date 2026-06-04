"""Doctor dashboard router — aggregated endpoints for the doctor's UI."""

from datetime import datetime, date, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.appointment import Appointment, AppointmentStatus
from app.models.diagnosis import Diagnosis
from app.models.mmse_result import MMSEResult
from app.models.symptom_entry import SymptomEntry
from app.models.game_session import GameSession
from app.models.daily_checkin import DailyCheckin
from app.services.risk_service import compute_risk
from app.utils.deps import get_current_user

router = APIRouter(prefix="/doctor", tags=["doctor-dashboard"])


def _require_doctor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="الأطباء فقط")
    return current_user


def _get_doctor_record(current_user: User, db: Session) -> Doctor:
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف الطبيب")
    return doctor


def _latest(model, patient_id: int, db: Session):
    return (
        db.query(model)
        .filter(model.patient_id == patient_id)
        .order_by(model.created_at.desc())
        .first()
    )


def _latest_completed_diagnosis(patient_id: int, db: Session):
    """Risk must be based on a doctor-approved diagnosis only — never a pending one."""
    return (
        db.query(Diagnosis)
        .filter(Diagnosis.patient_id == patient_id, Diagnosis.status == "completed")
        .order_by(Diagnosis.created_at.desc())
        .first()
    )


# ─── GET /api/doctor/stats ────────────────────────────────────────────────────
@router.get("/stats")
def doctor_stats(
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
) -> Dict:
    doctor = _get_doctor_record(current_user, db)

    total_patients = db.query(Patient).filter(Patient.assigned_doctor_id == doctor.id).count()

    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end   = today_start + timedelta(days=1)
    appointments_today = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.scheduled_at >= today_start,
            Appointment.scheduled_at < today_end,
            Appointment.status.in_([AppointmentStatus.APPROVED, AppointmentStatus.PENDING]),
        )
        .count()
    )

    # High-risk: count only patients whose LATEST diagnosis is Mild/ModerateDemented
    patients_list = (
        db.query(Patient)
        .filter(Patient.assigned_doctor_id == doctor.id)
        .all()
    )
    high_risk = 0
    for p in patients_list:
        latest_diag = _latest_completed_diagnosis(p.id, db)
        if latest_diag and latest_diag.classification in ("MildDemented", "ModerateDemented"):
            high_risk += 1

    return {
        "total_patients": total_patients,
        "appointments_today": appointments_today,
        "high_risk_patients": high_risk,
    }


# ─── GET /api/doctor/my-patients ──────────────────────────────────────────────
@router.get("/my-patients")
def my_patients(
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
) -> List[Dict]:
    doctor = _get_doctor_record(current_user, db)
    patients = (
        db.query(Patient)
        .join(User, User.id == Patient.user_id)
        .filter(User.is_active == True, Patient.assigned_doctor_id == doctor.id)
        .all()
    )

    result = []
    for p in patients:
        user = db.query(User).filter(User.id == p.user_id).first()
        diag = _latest(Diagnosis, p.id, db)
        mmse = _latest(MMSEResult, p.id, db)
        symp = _latest(SymptomEntry, p.id, db)

        # Risk is based only on a doctor-approved diagnosis, not a pending one
        risk_diag = _latest_completed_diagnosis(p.id, db)
        risk = compute_risk(
            risk_diag.classification if risk_diag else None,
            mmse.total_score if mmse else None,
            symp.total_score if symp else None,
        )

        result.append({
            "id": p.id,
            "user_id": p.user_id,
            "full_name": user.full_name if user else "",
            "email": user.email if user else "",
            "gender": p.gender,
            "date_of_birth": str(p.date_of_birth) if p.date_of_birth else None,
            "assigned_doctor_id": p.assigned_doctor_id,
            "latest_mri": {
                "classification": diag.classification,
                "confidence": diag.confidence,
                "date": diag.created_at.isoformat(),
            } if diag else None,
            "latest_mmse": {
                "score": mmse.total_score,
                "severity": mmse.severity_level,
                "date": mmse.created_at.isoformat(),
            } if mmse else None,
            "risk": risk,
        })

    return result


# ─── GET /api/doctor/risk-assessment/{patient_id} ─────────────────────────────
@router.get("/risk-assessment/{patient_id}")
def risk_assessment(
    patient_id: int,
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
) -> Dict:
    doctor = _get_doctor_record(current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="المريض غير موجود")
    if patient.assigned_doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")

    # A risk assessment must reflect approved data only
    diag = _latest_completed_diagnosis(patient_id, db)
    mmse = _latest(MMSEResult, patient_id, db)
    symp = _latest(SymptomEntry, patient_id, db)

    risk = compute_risk(
        diag.classification if diag else None,
        mmse.total_score if mmse else None,
        symp.total_score if symp else None,
    )

    return {
        **risk,
        "latest_mri": {
            "classification": diag.classification,
            "confidence": diag.confidence,
            "date": diag.created_at.isoformat(),
        } if diag else None,
        "latest_mmse": {
            "score": mmse.total_score,
            "severity": mmse.severity_level,
            "date": mmse.created_at.isoformat(),
        } if mmse else None,
        "latest_symptoms": {
            "score": symp.total_score,
            "severity": symp.severity_level,
            "date": symp.created_at.isoformat(),
        } if symp else None,
    }


# ─── GET /api/doctor/patient-summary/{patient_id} ────────────────────────────
@router.get("/patient-summary/{patient_id}")
def patient_summary(
    patient_id: int,
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
) -> Dict:
    doctor = _get_doctor_record(current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="المريض غير موجود")
    if patient.assigned_doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")
    user = db.query(User).filter(User.id == patient.user_id).first()

    # Latest records
    diag  = _latest(Diagnosis, patient_id, db)
    mmse  = _latest(MMSEResult, patient_id, db)
    symp  = _latest(SymptomEntry, patient_id, db)

    # Histories (last 10 of each)
    diag_history = (
        db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id)
        .order_by(Diagnosis.created_at.desc()).limit(10).all()
    )
    mmse_history = (
        db.query(MMSEResult).filter(MMSEResult.patient_id == patient_id)
        .order_by(MMSEResult.created_at.desc()).limit(10).all()
    )
    symp_history = (
        db.query(SymptomEntry).filter(SymptomEntry.patient_id == patient_id)
        .order_by(SymptomEntry.created_at.desc()).limit(10).all()
    )

    # Game stats
    sessions = db.query(GameSession).filter(GameSession.patient_id == patient_id).all()
    game_stats: Dict[str, Any] = {}
    for s in sessions:
        gt = s.game_type
        if gt not in game_stats:
            game_stats[gt] = {"sessions": 0, "total_score": 0, "best": 0}
        game_stats[gt]["sessions"] += 1
        game_stats[gt]["total_score"] += s.score
        game_stats[gt]["best"] = max(game_stats[gt]["best"], s.score)
    for gt in game_stats:
        n = game_stats[gt]["sessions"]
        game_stats[gt]["avg_score"] = round(game_stats[gt]["total_score"] / n) if n else 0

    # Upcoming appointments
    doctor = _get_doctor_record(current_user, db)
    now = datetime.utcnow()
    upcoming = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.doctor_id == doctor.id,
            Appointment.scheduled_at >= now,
            Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.APPROVED]),
        )
        .order_by(Appointment.scheduled_at)
        .limit(3)
        .all()
    )

    # Daily check-ins (last 7)
    week_ago = now - timedelta(days=7)
    checkins = (
        db.query(DailyCheckin)
        .filter(DailyCheckin.patient_id == patient_id, DailyCheckin.created_at >= week_ago)
        .order_by(DailyCheckin.created_at.desc())
        .all()
    )

    # Display keeps the true latest MRI (so the doctor sees pending ones),
    # but risk is computed from the latest approved diagnosis only.
    risk_diag = _latest_completed_diagnosis(patient_id, db)
    risk = compute_risk(
        risk_diag.classification if risk_diag else None,
        mmse.total_score if mmse else None,
        symp.total_score if symp else None,
    )

    def _diag_dict(d: Optional[Diagnosis]) -> Optional[Dict]:
        if not d:
            return None
        return {
            "id": d.id, "classification": d.classification,
            "confidence": d.confidence, "probabilities": d.probabilities,
            "doctor_notes": d.doctor_notes, "status": d.status,
            "date": d.created_at.isoformat(),
        }

    def _mmse_dict(m: Optional[MMSEResult]) -> Optional[Dict]:
        if not m:
            return None
        return {
            "id": m.id, "total_score": m.total_score,
            "severity_level": m.severity_level, "date": m.created_at.isoformat(),
        }

    def _symp_dict(s: Optional[SymptomEntry]) -> Optional[Dict]:
        if not s:
            return None
        return {
            "id": s.id, "total_score": s.total_score,
            "severity_level": s.severity_level, "scores": s.scores,
            "date": s.created_at.isoformat(),
        }

    return {
        "patient": {
            "id": patient.id,
            "full_name": user.full_name if user else "",
            "email": user.email if user else "",
            "gender": patient.gender,
            "date_of_birth": str(patient.date_of_birth) if patient.date_of_birth else None,
            "blood_type": patient.blood_type,
            "medical_history": patient.medical_history,
        },
        "latest_mri": _diag_dict(diag),
        "mri_history": [_diag_dict(d) for d in diag_history],
        "latest_mmse": _mmse_dict(mmse),
        "mmse_history": [_mmse_dict(m) for m in mmse_history],
        "latest_symptoms": _symp_dict(symp),
        "symptom_history": [_symp_dict(s) for s in symp_history],
        "game_stats": game_stats,
        "upcoming_appointments": [
            {
                "id": a.id, "scheduled_at": a.scheduled_at.isoformat(),
                "status": a.status, "notes": a.notes,
            }
            for a in upcoming
        ],
        "daily_checkins": [
            {"mood": c.mood, "date": c.created_at.isoformat()}
            for c in checkins
        ],
        "risk": risk,
    }


# ─── GET /api/doctor/patient-timeline/{patient_id} ───────────────────────────
@router.get("/patient-timeline/{patient_id}")
def patient_timeline(
    patient_id: int,
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
) -> List[Dict]:
    doctor = _get_doctor_record(current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="المريض غير موجود")
    if patient.assigned_doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")

    events: List[Dict] = []

    for d in db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id).all():
        events.append({
            "event_type": "mri",
            "date": d.created_at.isoformat(),
            "data": {"classification": d.classification, "confidence": d.confidence},
        })

    for m in db.query(MMSEResult).filter(MMSEResult.patient_id == patient_id).all():
        events.append({
            "event_type": "mmse",
            "date": m.created_at.isoformat(),
            "data": {"total_score": m.total_score, "severity_level": m.severity_level},
        })

    for s in db.query(SymptomEntry).filter(SymptomEntry.patient_id == patient_id).all():
        events.append({
            "event_type": "symptoms",
            "date": s.created_at.isoformat(),
            "data": {"total_score": s.total_score, "severity_level": s.severity_level},
        })

    for g in db.query(GameSession).filter(GameSession.patient_id == patient_id).all():
        events.append({
            "event_type": "game",
            "date": g.created_at.isoformat(),
            "data": {"game_type": g.game_type, "score": g.score},
        })

    for c in db.query(DailyCheckin).filter(DailyCheckin.patient_id == patient_id).all():
        events.append({
            "event_type": "checkin",
            "date": c.created_at.isoformat(),
            "data": {"mood": c.mood},
        })

    events.sort(key=lambda e: e["date"], reverse=True)
    return events[:50]
