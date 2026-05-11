"""Import all models so SQLAlchemy registers them with Base.metadata."""

from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.admin import Admin
from app.models.appointment import Appointment, AppointmentStatus
from app.models.message import Message
from app.models.diagnosis import Diagnosis
from app.models.mmse_result import MMSEResult
from app.models.symptom_entry import SymptomEntry
from app.models.game_session import GameSession
from app.models.family_contact import FamilyContact
from app.models.caregiver_assessment import CaregiverAssessment
from app.models.daily_checkin import DailyCheckin
from app.models.alzheimer_net_run import AlzheimerNetRun
from app.models.otp_token import OTPToken, OTPPurpose

__all__ = [
    "User", "UserRole",
    "Doctor",
    "Patient",
    "Admin",
    "Appointment", "AppointmentStatus",
    "Message",
    "Diagnosis",
    "MMSEResult",
    "SymptomEntry",
    "GameSession",
    "FamilyContact",
    "CaregiverAssessment",
    "DailyCheckin",
    "AlzheimerNetRun",
    "OTPToken", "OTPPurpose",
]
