"""Family Contact model — emergency/notification contacts linked to a patient."""

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class FamilyContact(Base):
    __tablename__ = "family_contacts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # if they have an account

    name = Column(String, nullable=False)
    email = Column(String)
    phone = Column(String)
    relationship = Column(String)   # ابن / ابنة / زوج / زوجة / أخ / أخت

    patient = relationship("Patient", backref="family_contacts")
