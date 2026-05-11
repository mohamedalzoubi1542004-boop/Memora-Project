"""Diagnosis router — MRI upload + AI classification + history."""

import io
import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.diagnosis import Diagnosis
from app.schemas.diagnosis_schema import DiagnosisOut, DiagnosisNotesUpdate
from app.services.ai_service import ai_service
from app.utils.deps import get_current_user

router = APIRouter(prefix="/diagnosis", tags=["diagnosis"])

UPLOAD_DIR = Path("./uploads/mri")

# ── MRI file validation constants ────────────────────────────────────────────

_MAX_SIZE_BYTES   = 15 * 1024 * 1024   # 15 MB
_MIN_DIMENSION_PX = 32                  # minimum width or height

_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"}

# (byte_offset, expected_magic_prefix)
_IMAGE_MAGIC: list[tuple[int, bytes]] = [
    (0, b"\xff\xd8\xff"),            # JPEG
    (0, b"\x89PNG\r\n\x1a\n"),       # PNG
    (0, b"BM"),                       # BMP
    (0, b"II*\x00"),                  # TIFF little-endian
    (0, b"MM\x00*"),                  # TIFF big-endian
]


async def _validate_mri_file(file: UploadFile) -> bytes:
    """
    Validate that *file* is a real, readable, reasonably-sized medical image.
    Returns the raw bytes on success; raises HTTPException(422) with an Arabic
    error message on every validation failure.
    """
    # 1 — Extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"صيغة الملف '{ext or 'غير معروفة'}' غير مدعومة — "
                "يُقبل فقط: JPEG، PNG، BMP، TIFF"
            ),
        )

    # 2 — Read all bytes (needed for size + magic + PIL checks)
    data = await file.read()

    # 3 — File size
    size_mb = len(data) / (1024 * 1024)
    if len(data) > _MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"حجم الملف ({size_mb:.1f} ميجابايت) يتجاوز الحد المسموح به "
                f"({_MAX_SIZE_BYTES // 1024 // 1024} ميجابايت)"
            ),
        )
    if len(data) < 8:
        raise HTTPException(status_code=422, detail="الملف فارغ أو تالف")

    # 4 — Magic bytes (confirms the content matches the extension)
    if not any(
        data[offset : offset + len(magic)] == magic
        for offset, magic in _IMAGE_MAGIC
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "محتوى الملف لا يتطابق مع امتداده — "
                "تأكد من أن الملف صورة حقيقية بصيغة JPEG أو PNG أو BMP أو TIFF"
            ),
        )

    # 5 — PIL integrity check + dimension validation
    try:
        from PIL import Image, UnidentifiedImageError  # noqa: PLC0415

        img = Image.open(io.BytesIO(data))
        img.verify()                        # raises on truncated / corrupt data
        img = Image.open(io.BytesIO(data))  # re-open after verify() exhausts stream
        width, height = img.size
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="الصورة تالفة أو لا يمكن قراءتها — يرجى رفع صورة MRI سليمة",
        )

    if width < _MIN_DIMENSION_PX or height < _MIN_DIMENSION_PX:
        raise HTTPException(
            status_code=422,
            detail=(
                f"أبعاد الصورة ({width}×{height} بكسل) صغيرة جداً — "
                f"الحد الأدنى المطلوب {_MIN_DIMENSION_PX}×{_MIN_DIMENSION_PX} بكسل"
            ),
        )

    return data


def _require_doctor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Doctors only")
    return current_user


def _build_out(d: Diagnosis) -> DiagnosisOut:
    probs = d.probabilities
    if isinstance(probs, str):
        try:
            probs = json.loads(probs)
        except Exception:
            probs = {}
    return DiagnosisOut(
        id=d.id,
        patient_id=d.patient_id,
        doctor_id=d.doctor_id,
        image_path=d.image_path,
        classification=d.classification,
        confidence=d.confidence,
        probabilities=probs,
        doctor_notes=d.doctor_notes,
        created_at=d.created_at,
    )


@router.post("/upload", response_model=DiagnosisOut)
async def upload_mri(
    patient_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Validate before saving to disk or calling the AI model
    image_bytes = await _validate_mri_file(file)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "image.jpg").suffix.lower() or ".jpg"
    filename = f"mri_{patient_id}_{doctor.id}_{int(__import__('time').time())}{ext}"
    dest = UPLOAD_DIR / filename

    with open(dest, "wb") as f:
        f.write(image_bytes)

    result = ai_service.predict(str(dest))

    probs_str = json.dumps(result.get("probabilities", {}))

    diag = Diagnosis(
        patient_id=patient_id,
        doctor_id=doctor.id,
        image_path=str(dest),
        classification=result["classification"],
        confidence=result["confidence"],
        probabilities=probs_str,
    )
    db.add(diag)

    # Auto-assign patient to this doctor on first MRI upload
    if patient.assigned_doctor_id is None:
        patient.assigned_doctor_id = doctor.id

    db.commit()
    db.refresh(diag)
    return _build_out(diag)


@router.get("/patient/{patient_id}", response_model=List[DiagnosisOut])
def patient_history(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.DOCTOR, UserRole.ADMIN):
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or patient.id != patient_id:
            raise HTTPException(status_code=403, detail="Access denied")

    records = (
        db.query(Diagnosis)
        .filter(Diagnosis.patient_id == patient_id)
        .order_by(Diagnosis.created_at.desc())
        .all()
    )
    return [_build_out(d) for d in records]


@router.get("/patient/{patient_id}/latest", response_model=DiagnosisOut)
def latest_diagnosis(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    diag = (
        db.query(Diagnosis)
        .filter(Diagnosis.patient_id == patient_id)
        .order_by(Diagnosis.created_at.desc())
        .first()
    )
    if not diag:
        raise HTTPException(status_code=404, detail="No diagnosis found")
    return _build_out(diag)


@router.put("/{diagnosis_id}/notes", response_model=DiagnosisOut)
def update_notes(
    diagnosis_id: int,
    data: DiagnosisNotesUpdate,
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
):
    diag = db.query(Diagnosis).filter(Diagnosis.id == diagnosis_id).first()
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    diag.doctor_notes = data.doctor_notes
    db.commit()
    db.refresh(diag)
    return _build_out(diag)
