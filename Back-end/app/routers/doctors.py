"""Doctor router — profile, listing, CV upload."""

import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.schemas.doctor_schema import DoctorOut, DoctorProfileUpdate
from app.utils.deps import get_current_user

router = APIRouter(prefix="/doctors", tags=["doctors"])

UPLOAD_DIR = Path("./uploads")


def _require_doctor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Doctors only")
    return current_user


@router.get("/me", response_model=DoctorOut)
def get_my_profile(
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
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
        raise HTTPException(status_code=404, detail="Doctor profile not found")

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
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    UPLOAD_DIR.mkdir(exist_ok=True)
    ext = Path(file.filename).suffix
    filename = f"cv_{current_user.id}{ext}"
    dest = UPLOAD_DIR / filename

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

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


@router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(
    doctor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    user = db.query(User).filter(User.id == doctor.user_id).first()
    doctor.full_name = user.full_name if user else ""
    doctor.email = user.email if user else ""
    return doctor
