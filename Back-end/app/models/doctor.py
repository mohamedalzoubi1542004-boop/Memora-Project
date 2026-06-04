"""Doctor profile — linked 1-to-1 with a User of role DOCTOR."""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    specialization = Column(String, default="طب الأعصاب")
    license_number = Column(String)
    cv_file = Column(String)        # relative path to uploaded CV
    bio = Column(Text)
    years_experience = Column(Integer)
    is_approved = Column(Boolean, default=False)   # admin must approve
    is_suspended = Column(Boolean, default=False)
    rejection_reason = Column(String)              # set when admin rejects the account

    user = relationship("User", backref="doctor_profile")
    diagnoses = relationship("Diagnosis", back_populates="doctor")
