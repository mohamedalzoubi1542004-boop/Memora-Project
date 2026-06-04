"""Doctor router — profile, listing, CV upload."""

import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.schemas.doctor_schema import DoctorOut, DoctorProfileUpdate
from app.utils.deps import get_current_user
from app.utils.file_utils import validate_cv_upload

router = APIRouter(prefix="/doctors", tags=["doctors"])

UPLOAD_DIR = Path("./uploads")


def _require_doctor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="الأطباء فقط")
    return current_user


@router.get("/me", response_model=DoctorOut)
def get_my_profile(
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف الطبيب")
    doctor.full_name = current_user.full_name
    doctor.email = current_user.email
    return doctor


@router.put("/me", response_model=DoctorOut)
def update_my_profile(
    data: DoctorProfileUpdate,
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف الطبيب")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(doctor, field, value)

    db.commit()
    db.refresh(doctor)
    doctor.full_name = current_user.full_name
    doctor.email = current_user.email
    return doctor


@router.post("/me/cv")
def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف الطبيب")

    data = file.file.read()
    validate_cv_upload(file.filename, data)
    ext = Path(file.filename or "").suffix.lower()

    UPLOAD_DIR.mkdir(exist_ok=True)

    # Remove any previous CV for this doctor (extension may differ)
    if doctor.cv_file:
        old = (UPLOAD_DIR / doctor.cv_file).resolve()
        if old.is_relative_to(UPLOAD_DIR.resolve()) and old.exists():
            old.unlink()

    filename = f"cv_{current_user.id}{ext}"
    dest = UPLOAD_DIR / filename
    with open(dest, "wb") as f:
        f.write(data)

    doctor.cv_file = filename
    db.commit()
    return {"filename": filename}


@router.get("", response_model=list[DoctorOut])
def list_approved_doctors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doctors = db.query(Doctor).filter(
        Doctor.is_approved == True,
        Doctor.is_suspended == False,
    ).all()
    result = []
    for d in doctors:
        user = db.query(User).filter(User.id == d.user_id).first()
        d.full_name = user.full_name if user else ""
        d.email = user.email if user else ""
        result.append(d)
    return result


@router.get("/{doctor_id}/cv")
def download_cv(
    doctor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serve a doctor's CV file — admin or the doctor themselves only."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="الطبيب غير موجود")

    if current_user.role != UserRole.ADMIN and doctor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    if not doctor.cv_file:
        raise HTTPException(status_code=404, detail="لا توجد سيرة ذاتية مرفوعة")

    # Resolve under UPLOAD_DIR and guard against path traversal
    filepath = (UPLOAD_DIR / doctor.cv_file).resolve()
    if not filepath.is_relative_to(UPLOAD_DIR.resolve()):
        raise HTTPException(status_code=400, detail="مسار ملف غير صالح")
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="ملف السيرة الذاتية غير موجود على الخادم")

    return FileResponse(path=str(filepath), filename=filepath.name)


@router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(
    doctor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="الطبيب غير موجود")

    # Non-admins may only look up doctors that are approved and not suspended
    if current_user.role != UserRole.ADMIN:
        if not doctor.is_approved or doctor.is_suspended:
            raise HTTPException(status_code=404, detail="الطبيب غير موجود")

    user = db.query(User).filter(User.id == doctor.user_id).first()
    doctor.full_name = user.full_name if user else ""
    doctor.email = user.email if user else ""
    return doctor
