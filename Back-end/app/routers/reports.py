"""Reports router — generate and download PDF patient reports."""

import os
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.diagnosis import Diagnosis
from app.models.mmse_result import MMSEResult
from app.models.symptom_entry import SymptomEntry
from app.models.game_session import GameSession
from app.services.report_service import generate_patient_report
from app.services.risk_service import compute_risk
from app.utils.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

REPORTS_DIR = Path("./reports")


def _require_doctor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Doctors only")
    return current_user


@router.post("/generate/{patient_id}")
def generate_report(
    patient_id: int,
    doctor_notes: str = "",
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    patient_user = db.query(User).filter(User.id == patient.user_id).first()

    latest_diag = (
        db.query(Diagnosis)
        .filter(Diagnosis.patient_id == patient_id)
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

    game_sessions = (
        db.query(GameSession)
        .filter(GameSession.patient_id == patient_id)
        .order_by(GameSession.created_at.desc())
        .limit(10)
        .all()
    )

    risk = compute_risk(
        mri_classification=latest_diag.classification if latest_diag else None,
        mmse_score=latest_mmse.total_score if latest_mmse else None,
        symptom_score=latest_symptoms.total_score if latest_symptoms else None,
    )

    diag_data = None
    if latest_diag:
        import json
        probs = latest_diag.probabilities
        if isinstance(probs, str):
            try:
                probs = json.loads(probs)
            except Exception:
                probs = {}
        diag_data = {
            "classification": latest_diag.classification,
            "confidence": latest_diag.confidence,
            "probabilities": probs,
        }

    mmse_data = None
    if latest_mmse:
        mmse_data = {
            "total_score": latest_mmse.total_score,
            "severity_level": latest_mmse.severity_level,
        }

    symptoms_data = None
    if latest_symptoms:
        symptoms_data = {
            "total_score": latest_symptoms.total_score,
            "severity_level": latest_symptoms.severity_level,
        }

    games_data = None
    if game_sessions:
        games_data = [
            {"game_type": gs.game_type, "score": gs.score, "date": gs.created_at.isoformat()}
            for gs in game_sessions
        ]

    filename = generate_patient_report(
        patient_name=patient_user.full_name if patient_user else "Unknown",
        patient_gender=patient.gender,
        doctor_name=current_user.full_name,
        diagnosis=diag_data,
        mmse=mmse_data,
        symptoms=symptoms_data,
        games=games_data,
        risk=risk,
        doctor_notes=doctor_notes,
    )

    return {"filename": filename, "url": f"/reports/{filename}"}


@router.get("/download/{filename}")
def download_report(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.DOCTOR, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    filepath = REPORTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Report not found")

    return FileResponse(
        path=str(filepath),
        filename=filename,
        media_type="application/pdf",
    )


@router.get("/list")
def list_reports(
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.DOCTOR, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    REPORTS_DIR.mkdir(exist_ok=True)
    files = sorted(REPORTS_DIR.glob("*.pdf"), key=os.path.getmtime, reverse=True)
    return [
        {
            "filename": f.name,
            "url": f"/reports/{f.name}",
            "size_kb": round(f.stat().st_size / 1024, 1),
        }
        for f in files
    ]
