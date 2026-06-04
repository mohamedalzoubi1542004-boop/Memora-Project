"""Patient router — profile management, patient list for doctors."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.family_contact import FamilyContact
from app.schemas.patient_schema import PatientOut, PatientProfileUpdate, PatientSummary
from app.utils.deps import get_current_user

router = APIRouter(prefix="/patients", tags=["patients"])


def _require_patient(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="المرضى فقط")
    return current_user



@router.get("/me", response_model=PatientOut)
def get_my_profile(
    current_user: User = Depends(_require_patient),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف المريض")
    patient.full_name = current_user.full_name
    patient.email = current_user.email
    return patient


@router.put("/me", response_model=PatientOut)
def update_my_profile(
    data: PatientProfileUpdate,
    current_user: User = Depends(_require_patient),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف المريض")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    patient.full_name = current_user.full_name
    patient.email = current_user.email
    return patient


@router.get("", response_model=list[PatientSummary])
def list_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.DOCTOR, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    query = db.query(Patient).join(User, User.id == Patient.user_id).filter(User.is_active == True)

    if current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="لم يُعثر على ملف الطبيب")
        query = query.filter(Patient.assigned_doctor_id == doctor.id)

    patients = query.all()
    result = []
    for p in patients:
        user = db.query(User).filter(User.id == p.user_id).first()
        result.append(PatientSummary(
            id=p.id,
            user_id=p.user_id,
            full_name=user.full_name if user else "",
            email=user.email if user else "",
            gender=p.gender,
            date_of_birth=p.date_of_birth,
            assigned_doctor_id=p.assigned_doctor_id,
        ))
    return result


@router.delete("/me/doctor")
def unassign_my_doctor(
    current_user: User = Depends(_require_patient),
    db: Session = Depends(get_db),
):
    """Allow a patient to unlink themselves from their current doctor."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف المريض")
    if patient.assigned_doctor_id is None:
        raise HTTPException(status_code=400, detail="لا يوجد طبيب مرتبط بحسابك حالياً")
    patient.assigned_doctor_id = None
    db.commit()
    return {"message": "تم إلغاء ارتباطك بالطبيب بنجاح"}


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient_detail(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.DOCTOR, UserRole.ADMIN, UserRole.FAMILY):
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="المريض غير موجود")

    if current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or patient.assigned_doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="هذا المريض غير مسجل تحت إشرافك")
    elif current_user.role == UserRole.FAMILY:
        is_contact = db.query(FamilyContact).filter(
            FamilyContact.patient_id == patient_id,
            FamilyContact.user_id == current_user.id,
        ).first()
        if not is_contact:
            raise HTTPException(status_code=403, detail="لا يحق لك الوصول لبيانات هذا المريض")

    user = db.query(User).filter(User.id == patient.user_id).first()
    patient.full_name = user.full_name if user else ""
    patient.email = user.email if user else ""
    return patient
