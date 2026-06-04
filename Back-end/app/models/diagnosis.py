"""Diagnosis model — stores AI MRI classification result per patient visit."""

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)

    image_path = Column(String, nullable=False)          # relative path to stored MRI image
    classification = Column(String, nullable=False)      # NonDemented / MildDemented / ModerateDemented
    confidence = Column(Float, nullable=False)           # 0.0 – 1.0
    probabilities = Column(String)                       # JSON string of per-class probabilities
    doctor_notes = Column(String)
    # pending  → AI result awaiting the doctor's review (hidden from the patient)
    # completed → reviewed & approved by the doctor (visible to the patient)
    status = Column(String, default="pending", nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient")
    doctor = relationship("Doctor", back_populates="diagnoses")
