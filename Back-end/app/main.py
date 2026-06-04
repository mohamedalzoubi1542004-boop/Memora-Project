"""Memora FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy import inspect, text

from app.database import engine, Base
from app.routers import (
    auth, games, patients, doctors, admin,
    appointments, messages, diagnosis, mmse,
    symptoms, family, caregiver, checkin, reports,
    doctor_dashboard,
)
from app.services.ai_service import ai_service


# Ensure upload directories exist before the static mount is evaluated
os.makedirs("uploads/avatars", exist_ok=True)
os.makedirs("uploads/mri", exist_ok=True)
os.makedirs("uploads/cvs", exist_ok=True)
os.makedirs("reports", exist_ok=True)


def _run_lightweight_migrations() -> None:
    """Add columns / normalize data introduced after the DB was first created."""
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if "doctors" in tables:
        columns = {c["name"] for c in inspector.get_columns("doctors")}
        if "rejection_reason" not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE doctors ADD COLUMN rejection_reason VARCHAR"))
                conn.commit()

    # SQLAlchemy's Enum column stores the member NAME (uppercase). Older rows
    # may hold lowercase values ('approved') which crash on deserialization.
    if "appointments" in tables:
        with engine.connect() as conn:
            conn.execute(text(
                "UPDATE appointments SET status = UPPER(status) WHERE status <> UPPER(status)"
            ))
            conn.commit()

    # Diagnosis approval gate: new 'status' column. Diagnoses that existed
    # before this column was added were already visible, so grandfather them
    # as 'completed' — the pending gate only applies to new uploads.
    if "diagnoses" in tables:
        diag_columns = {c["name"] for c in inspector.get_columns("diagnoses")}
        if "status" not in diag_columns:
            with engine.connect() as conn:
                conn.execute(text(
                    "ALTER TABLE diagnoses ADD COLUMN status VARCHAR DEFAULT 'pending'"
                ))
                conn.execute(text("UPDATE diagnoses SET status = 'completed'"))
                conn.commit()

    # Emergency contact split into separate name + phone columns
    if "patients" in tables:
        pcols = {c["name"] for c in inspector.get_columns("patients")}
        if "emergency_contact_name" not in pcols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE patients ADD COLUMN emergency_contact_name VARCHAR"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN emergency_contact_phone VARCHAR"))
                # Carry the old single free-text field over into the name column
                if "emergency_contact" in pcols:
                    conn.execute(text(
                        "UPDATE patients SET emergency_contact_name = emergency_contact "
                        "WHERE emergency_contact IS NOT NULL AND emergency_contact <> ''"
                    ))
                conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables + load AI model
    Base.metadata.create_all(bind=engine)
    _run_lightweight_migrations()
    ai_service.load_model()
    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="Memora API",
    description="Elderly Care Platform with AI-Powered Alzheimer's Detection",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    # CRITICAL: disable trailing-slash redirects.
    # Browsers strip the Authorization header on cross-origin redirects, which
    # caused 401s and false "session expired" redirects to /login.
    redirect_slashes=False,
)

# ---------------------------------------------------------------------------
# CORS — allow Next.js dev server on 3000/3001
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static file mounts
# ---------------------------------------------------------------------------
# Only avatars are public. MRI scans (uploads/mri) and doctor CVs (uploads/cvs,
# uploads/cv_*) are sensitive and MUST be served via authenticated endpoints
# (/diagnosis/{id}/image and /doctors/{id}/cv) — never as public static files.
app.mount("/uploads/avatars", StaticFiles(directory="uploads/avatars"), name="avatars")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(games.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(admin.router)
app.include_router(appointments.router)
app.include_router(messages.router)
app.include_router(diagnosis.router)
app.include_router(mmse.router)
app.include_router(symptoms.router)
app.include_router(family.router)
app.include_router(caregiver.router)
app.include_router(checkin.router)
app.include_router(reports.router)
app.include_router(doctor_dashboard.router)


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Memora API is running",
        "version": "1.0.0",
        "status": "healthy",
        "ai_model": "loaded" if ai_service._loaded else "demo",
    }
