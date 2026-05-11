"""OTPToken — stores temporary codes for email/phone verification and password reset."""

import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class OTPPurpose(str, enum.Enum):
    VERIFY = "verify"
    RESET  = "reset"


class OTPToken(Base):
    __tablename__ = "otp_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    identifier = Column(String, nullable=False, index=True)   # email or phone
    code       = Column(String(6), nullable=False)
    purpose    = Column(Enum(OTPPurpose), nullable=False)
    is_used    = Column(Boolean, default=False)
    attempts   = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
