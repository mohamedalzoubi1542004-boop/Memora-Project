"""Shared file-upload helpers."""

import os
import uuid

from fastapi import UploadFile

from app.config import settings

ALLOWED_CV_TYPES = {"application/pdf", "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/dicom"}


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
