"""Diagnosis router — MRI upload + AI classification + history."""

import io
import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.diagnosis import Diagnosis
from app.schemas.diagnosis_schema import DiagnosisOut, DiagnosisNotesUpdate, DiagnosisApprove
from app.services.ai_service import ai_service, OODImageError
from app.utils.deps import get_current_user

router = APIRouter(prefix="/diagnosis", tags=["diagnosis"])

UPLOAD_DIR = Path("./uploads/mri")

# Diagnosis review states
STATUS_PENDING   = "pending"     # AI result awaiting doctor review — hidden from the patient
STATUS_COMPLETED = "completed"   # reviewed & approved by the doctor — visible to the patient

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
        raise HTTPException(status_code=403, detail="الأطباء فقط")
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
        status=d.status or STATUS_PENDING,
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
        raise HTTPException(status_code=404, detail="المريض غير موجود")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف الطبيب")

    # Reject unapproved or suspended doctors
    if not doctor.is_approved:
        raise HTTPException(status_code=403, detail="حسابك لم يُوافق عليه بعد من قِبل المدير")
    if doctor.is_suspended:
        raise HTTPException(status_code=403, detail="حسابك موقوف — يرجى التواصل مع الإدارة")

    # If patient already has a different assigned doctor, block the upload
    if patient.assigned_doctor_id is not None and patient.assigned_doctor_id != doctor.id:
        raise HTTPException(
            status_code=403,
            detail="هذا المريض مسجل تحت إشراف طبيب آخر ولا يمكنك رفع صور له",
        )

    # Validate before saving to disk or calling the AI model
    image_bytes = await _validate_mri_file(file)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "image.jpg").suffix.lower() or ".jpg"
    filename = f"mri_{patient_id}_{doctor.id}_{int(__import__('time').time())}{ext}"
    dest = UPLOAD_DIR / filename

    with open(dest, "wb") as f:
        f.write(image_bytes)

    try:
        result = ai_service.predict(str(dest))
    except OODImageError as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc))

    probs_str = json.dumps(result.get("probabilities", {}))

    diag = Diagnosis(
        patient_id=patient_id,
        doctor_id=doctor.id,
        image_path=str(dest),
        classification=result["classification"],
        confidence=result["confidence"],
        probabilities=probs_str,
        status=STATUS_PENDING,   # awaits doctor approval before the patient can see it
    )
    db.add(diag)

    # Auto-assign patient to this doctor on first MRI upload (only if unassigned)
    if patient.assigned_doctor_id is None:
        patient.assigned_doctor_id = doctor.id

    try:
        db.commit()
    except Exception:
        dest.unlink(missing_ok=True)  # clean up orphaned file on DB failure
        raise HTTPException(status_code=500, detail="فشل حفظ التشخيص — يرجى المحاولة مرة أخرى")

    db.refresh(diag)
    return _build_out(diag)


@router.get("/patient/{patient_id}", response_model=List[DiagnosisOut])
def patient_history(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_clinician = current_user.role in (UserRole.DOCTOR, UserRole.ADMIN)
    if not is_clinician:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or patient.id != patient_id:
            raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    query = db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id)
    # The patient only sees diagnoses the doctor has reviewed & approved
    if not is_clinician:
        query = query.filter(Diagnosis.status == STATUS_COMPLETED)

    records = query.order_by(Diagnosis.created_at.desc()).all()
    return [_build_out(d) for d in records]


@router.get("/patient/{patient_id}/latest", response_model=DiagnosisOut)
def latest_diagnosis(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Same access control as patient_history
    is_clinician = current_user.role in (UserRole.DOCTOR, UserRole.ADMIN)
    if not is_clinician:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or patient.id != patient_id:
            raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    query = db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id)
    if not is_clinician:
        query = query.filter(Diagnosis.status == STATUS_COMPLETED)

    diag = query.order_by(Diagnosis.created_at.desc()).first()
    if not diag:
        raise HTTPException(status_code=404, detail="لا يوجد تشخيص لهذا المريض")
    return _build_out(diag)


@router.get("/my/pending-count")
def my_pending_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """How many of the patient's own diagnoses are still awaiting doctor review."""
    if current_user.role != UserRole.PATIENT:
        return {"pending": 0}
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return {"pending": 0}
    count = db.query(Diagnosis).filter(
        Diagnosis.patient_id == patient.id,
        Diagnosis.status == STATUS_PENDING,
    ).count()
    return {"pending": count}


@router.get("/{diagnosis_id}/image")
def get_mri_image(
    diagnosis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the MRI image file for a diagnosis — doctors, the patient themselves, or admin only."""
    diag = db.query(Diagnosis).filter(Diagnosis.id == diagnosis_id).first()
    if not diag:
        raise HTTPException(status_code=404, detail="التشخيص غير موجود")

    # Access control
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or diag.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="غير مصرح بالوصول")
    elif current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or patient.id != diag.patient_id:
            raise HTTPException(status_code=403, detail="غير مصرح بالوصول")
        # The patient cannot view an MRI whose diagnosis is still pending review
        if diag.status != STATUS_COMPLETED:
            raise HTTPException(status_code=403, detail="هذا التشخيص قيد المراجعة من الطبيب")
    else:
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    image_path = Path(diag.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="ملف الصورة غير موجود على الخادم")

    suffix = image_path.suffix.lower()
    media_type_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".bmp": "image/bmp",
        ".tiff": "image/tiff", ".tif": "image/tiff",
    }
    media_type = media_type_map.get(suffix, "application/octet-stream")
    return FileResponse(path=str(image_path), media_type=media_type)


@router.put("/{diagnosis_id}/notes", response_model=DiagnosisOut)
def update_notes(
    diagnosis_id: int,
    data: DiagnosisNotesUpdate,
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
):
    diag = db.query(Diagnosis).filter(Diagnosis.id == diagnosis_id).first()
    if not diag:
        raise HTTPException(status_code=404, detail="التشخيص غير موجود")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor or diag.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="لا يمكنك تعديل ملاحظات تشخيص لم ترفعه أنت")

    diag.doctor_notes = data.doctor_notes
    db.commit()
    db.refresh(diag)
    return _build_out(diag)


@router.post("/{diagnosis_id}/approve", response_model=DiagnosisOut)
def approve_diagnosis(
    diagnosis_id: int,
    data: DiagnosisApprove = DiagnosisApprove(),
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
):
    """Doctor reviews the AI result, optionally adds notes, and approves it.
    Approval flips the diagnosis to 'completed' — only then can the patient see it."""
    diag = db.query(Diagnosis).filter(Diagnosis.id == diagnosis_id).first()
    if not diag:
        raise HTTPException(status_code=404, detail="التشخيص غير موجود")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف الطبيب")

    # Normally only the uploading doctor approves. But if that doctor was removed
    # (diag.doctor_id is NULL), the patient's current assigned doctor may take over,
    # so the diagnosis is not stranded as pending forever.
    can_approve = diag.doctor_id == doctor.id
    if diag.doctor_id is None:
        patient = db.query(Patient).filter(Patient.id == diag.patient_id).first()
        can_approve = patient is not None and patient.assigned_doctor_id == doctor.id
    if not can_approve:
        raise HTTPException(status_code=403, detail="لا يمكنك اعتماد تشخيص لم ترفعه أنت")

    if diag.status == STATUS_COMPLETED:
        raise HTTPException(status_code=400, detail="هذا التشخيص معتمد مسبقاً")

    if data.doctor_notes is not None:
        diag.doctor_notes = data.doctor_notes.strip()
    diag.status = STATUS_COMPLETED
    db.commit()
    db.refresh(diag)
    return _build_out(diag)
