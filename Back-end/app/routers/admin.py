"""Admin router — doctor approval, user management, platform stats."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.diagnosis import Diagnosis
from app.schemas.doctor_schema import DoctorOut
from app.utils.deps import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admins only")
    return current_user


@router.get("/stats")
def platform_stats(
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    total_users = db.query(User).count()
    total_doctors = db.query(Doctor).count()
    approved_doctors = db.query(Doctor).filter(Doctor.is_approved == True).count()
    pending_doctors = db.query(Doctor).filter(Doctor.is_approved == False).count()
    total_patients = db.query(Patient).count()

    return {
        "total_users": total_users,
        "total_doctors": total_doctors,
        "approved_doctors": approved_doctors,
        "pending_doctors": pending_doctors,
        "total_patients": total_patients,
    }


@router.get("/doctors/pending", response_model=list[DoctorOut])
def pending_doctors(
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    doctors = db.query(Doctor).filter(Doctor.is_approved == False).all()
    result = []
    for d in doctors:
        user = db.query(User).filter(User.id == d.user_id).first()
        d.full_name = user.full_name if user else ""
        d.email = user.email if user else ""
        result.append(d)
    return result


@router.get("/doctors", response_model=list[DoctorOut])
def all_doctors(
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    doctors = db.query(Doctor).all()
    result = []
    for d in doctors:
        user = db.query(User).filter(User.id == d.user_id).first()
        d.full_name = user.full_name if user else ""
        d.email = user.email if user else ""
        result.append(d)
    return result


@router.post("/doctors/{doctor_id}/approve")
def approve_doctor(
    doctor_id: int,
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor.is_approved = True
    db.commit()
    return {"message": "Doctor approved"}


@router.post("/doctors/{doctor_id}/reject")
def reject_doctor(
    doctor_id: int,
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    user = db.query(User).filter(User.id == doctor.user_id).first()
    if user:
        user.is_active = False
    db.commit()
    return {"message": "Doctor rejected"}


@router.post("/doctors/{doctor_id}/suspend")
def suspend_doctor(
    doctor_id: int,
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor.is_suspended = True
    db.commit()
    return {"message": "Doctor suspended"}


@router.post("/doctors/{doctor_id}/unsuspend")
def unsuspend_doctor(
    doctor_id: int,
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor.is_suspended = False
    db.commit()
    return {"message": "Doctor unsuspended"}


@router.get("/users")
def list_users(
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value,
            "is_active": u.is_active,
        }
        for u in users
    ]


@router.post("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    current_admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="لا يمكنك إيقاف حسابك الشخصي")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="لا يمكن إيقاف حساب مدير النظام")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}


@router.post("/users/{user_id}/activate")
def activate_user(
    user_id: int,
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    return {"message": "User activated"}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


class _AssignDoctorBody(BaseModel):
    doctor_id: int | None  # None = remove assignment


@router.post("/patients/{patient_id}/assign-doctor")
def assign_doctor_to_patient(
    patient_id: int,
    data: _AssignDoctorBody,
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if data.doctor_id is not None:
        doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id, Doctor.is_approved == True).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found or not approved")
    patient.assigned_doctor_id = data.doctor_id
    db.commit()
    return {"message": "تم تحديث الطبيب المعالج"}


@router.get("/activity")
def platform_activity(
    limit: int = 30,
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    """Return recent platform events: new registrations, appointments, diagnoses."""
    events = []

    recent_users = db.query(User).order_by(User.created_at.desc()).limit(limit).all()
    for u in recent_users:
        events.append({
            "type": "register",
            "label": f"تسجيل مستخدم جديد — {u.full_name}",
            "sub": u.role.value,
            "date": u.created_at.isoformat() if u.created_at else None,
        })

    recent_appts = db.query(Appointment).order_by(Appointment.created_at.desc()).limit(limit).all()
    for a in recent_appts:
        events.append({
            "type": "appointment",
            "label": "موعد جديد",
            "sub": getattr(a.status, "value", str(a.status)),
            "date": a.created_at.isoformat() if a.created_at else None,
        })

    recent_diag = db.query(Diagnosis).order_by(Diagnosis.created_at.desc()).limit(limit).all()
    for d in recent_diag:
        events.append({
            "type": "diagnosis",
            "label": f"تشخيص MRI — {d.classification}",
            "sub": f"ثقة {round(d.confidence * 100)}%",
            "date": d.created_at.isoformat() if d.created_at else None,
        })

    events.sort(key=lambda e: e["date"] or "", reverse=True)
    return events[:limit]
