"""Memora FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base

# Create all tables on startup (development convenience — use Alembic in production)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Memora API",
    description="Elderly Care Platform with AI-Powered Alzheimer's Detection",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static file mounts (uploads & generated reports)
# ---------------------------------------------------------------------------
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/reports", StaticFiles(directory="reports"), name="reports")


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"])
async def root():
    """Confirm the API is reachable."""
    return {"message": "Memora API is running", "version": "1.0.0"}
