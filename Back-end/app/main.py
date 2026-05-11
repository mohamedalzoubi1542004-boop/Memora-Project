"""Memora FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base
from app.routers import (
    auth, games, patients, doctors, admin,
    appointments, messages, diagnosis, mmse,
    symptoms, family, caregiver, checkin, reports,
    doctor_dashboard,
)
from app.services.ai_service import ai_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables + load AI model
    Base.metadata.create_all(bind=engine)
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("uploads/mri", exist_ok=True)
    os.makedirs("reports", exist_ok=True)
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
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/reports", StaticFiles(directory="reports"), name="reports")

# ---------------------------------------------------------------------------
# Routers — all 14
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
