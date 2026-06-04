"""Patient profile — linked 1-to-1 with a User of role PATIENT."""

from sqlalchemy import Column, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    date_of_birth = Column(Date)
    gender = Column(String)        # male / female
    blood_type = Column(String)
    emergency_contact_name = Column(String)
    emergency_contact_phone = Column(String)
    medical_history = Column(Text)
    allergies = Column(Text)         # comma-separated
    medications = Column(Text)       # current medications
    assigned_doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", backref="patient_profile")
    assigned_doctor = relationship("Doctor", foreign_keys=[assigned_doctor_id])
