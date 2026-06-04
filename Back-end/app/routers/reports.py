"""Reports router — generate and download PDF patient reports."""

from pathlib import Path

from fastapi import APIRouter, Body, Depends, HTTPException
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
from app.models.report import Report
from app.services.report_service import generate_patient_report
from app.services.risk_service import compute_risk
from app.utils.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

REPORTS_DIR = Path("./reports")


def _require_doctor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="الأطباء فقط")
    return current_user


def _report_for(filename: str, current_user: User, db: Session) -> Report:
    """Fetch a Report row by filename and verify the caller may access it."""
    report = db.query(Report).filter(Report.filename == filename).first()
    if not report:
        raise HTTPException(status_code=404, detail="التقرير غير موجود")
    if current_user.role == UserRole.ADMIN:
        return report
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor or report.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="لا يمكنك الوصول لتقرير لم تُصدِره أنت")
    return report


@router.post("/generate/{patient_id}")
def generate_report(
    patient_id: int,
    doctor_notes: str = Body(default="", embed=True),
    current_user: User = Depends(_require_doctor),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="المريض غير موجود")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="لم يُعثر على ملف الطبيب")
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

    # Record who generated this report for which patient (ownership + audit)
    report = Report(patient_id=patient_id, doctor_id=doctor.id, filename=filename)
    db.add(report)
    db.commit()

    return {"filename": filename, "url": f"/reports/{filename}"}


@router.delete("/{filename}")
def delete_report(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.DOCTOR, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    report = _report_for(filename, current_user, db)

    # Prevent path traversal
    filepath = (REPORTS_DIR / filename).resolve()
    if not filepath.is_relative_to(REPORTS_DIR.resolve()):
        raise HTTPException(status_code=400, detail="اسم ملف غير صالح")

    if filepath.exists():
        filepath.unlink()
    db.delete(report)
    db.commit()
    return {"message": "تم حذف التقرير بنجاح"}


@router.get("/download/{filename}")
def download_report(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.DOCTOR, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    _report_for(filename, current_user, db)   # ownership check

    filepath = (REPORTS_DIR / filename).resolve()
    if not filepath.is_relative_to(REPORTS_DIR.resolve()):
        raise HTTPException(status_code=400, detail="اسم ملف غير صالح")
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="التقرير غير موجود")

    return FileResponse(
        path=str(filepath),
        filename=filename,
        media_type="application/pdf",
    )


@router.get("/list")
def list_reports(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.DOCTOR, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول")

    limit = min(limit, 100)

    query = db.query(Report)
    # A doctor sees only the reports they generated; an admin sees all
    if current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return {"total": 0, "skip": skip, "limit": limit, "items": []}
        query = query.filter(Report.doctor_id == doctor.id)

    query = query.order_by(Report.created_at.desc())
    total = query.count()
    rows = query.offset(skip).limit(limit).all()

    items = []
    for r in rows:
        patient = db.query(Patient).filter(Patient.id == r.patient_id).first()
        p_user = db.query(User).filter(User.id == patient.user_id).first() if patient else None
        filepath = REPORTS_DIR / r.filename
        items.append({
            "filename": r.filename,
            "url": f"/reports/{r.filename}",
            "patient_name": p_user.full_name if p_user else "—",
            "size_kb": round(filepath.stat().st_size / 1024, 1) if filepath.exists() else 0,
            "date": r.created_at.isoformat() if r.created_at else None,
        })

    return {"total": total, "skip": skip, "limit": limit, "items": items}
