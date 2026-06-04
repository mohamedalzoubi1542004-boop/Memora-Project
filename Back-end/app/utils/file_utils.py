"""Shared file-upload helpers."""

import os
import uuid

from fastapi import HTTPException, UploadFile

from app.config import settings

ALLOWED_CV_TYPES = {"application/pdf", "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/dicom"}

# ── CV upload validation ─────────────────────────────────────────────────────
CV_ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
CV_MAX_BYTES = 10 * 1024 * 1024   # 10 MB
# (byte_offset, magic_prefix) — confirms the content matches the extension
_CV_MAGIC: list[tuple[int, bytes]] = [
    (0, b"%PDF"),                              # PDF
    (0, b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"),  # DOC (OLE2)
    (0, b"PK\x03\x04"),                        # DOCX (ZIP/OOXML)
]


def validate_cv_upload(filename: str | None, data: bytes) -> None:
    """Raise HTTPException(422) unless *data* is a valid PDF/DOC/DOCX CV file."""
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in CV_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail="صيغة الملف غير مدعومة — يُقبل فقط PDF أو DOC أو DOCX",
        )
    if len(data) > CV_MAX_BYTES:
        raise HTTPException(
            status_code=422,
            detail=f"حجم الملف يتجاوز الحد المسموح ({CV_MAX_BYTES // 1024 // 1024} ميجابايت)",
        )
    if len(data) < 8:
        raise HTTPException(status_code=422, detail="الملف فارغ أو تالف")
    if not any(data[offset : offset + len(magic)] == magic for offset, magic in _CV_MAGIC):
        raise HTTPException(
            status_code=422,
            detail="محتوى الملف لا يتطابق مع امتداده — تأكد من رفع ملف PDF أو Word حقيقي",
        )


def save_upload(file: UploadFile, subfolder: str = "uploads") -> str:
    """Save an uploaded file to disk and return its relative path."""
    base_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(base_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "file")[1] or ".bin"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(base_dir, filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    return f"{subfolder}/{filename}"
