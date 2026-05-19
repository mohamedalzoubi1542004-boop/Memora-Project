"""Authentication router — register, login, profile, OTP verification, password reset."""

import random
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.admin import Admin
from app.models.doctor import Doctor
from app.models.otp_token import OTPPurpose, OTPToken
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.schemas.user_schema import Token, UserLogin, UserOut, UserRegister
from app.utils.deps import get_current_user
from app.utils.file_utils import save_upload

router = APIRouter(prefix="/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_OTP_EXPIRY_MINUTES = 10
_OTP_MAX_ATTEMPTS   = 5


# ── Helpers ────────────────────────────────────────────────────────────────

def _hash(password: str) -> str:
    return pwd_context.hash(password)


def _verify(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def _invalidate_old_otps(db: Session, identifier: str, purpose: str) -> None:
    db.query(OTPToken).filter(
        OTPToken.identifier == identifier,
        OTPToken.purpose    == purpose,
        OTPToken.is_used    == False,
    ).update({"is_used": True})


# ── Registration ───────────────────────────────────────────────────────────

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register patient, family, or admin accounts (JSON body)."""
    if data.role == UserRole.DOCTOR:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "تسجيل الأطباء يتم عبر /auth/register-doctor",
        )
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "البريد الإلكتروني مستخدم مسبقاً")

    user = User(
        email=data.email,
        hashed_password=_hash(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
    )
    db.add(user)
    db.flush()

    if data.role == UserRole.PATIENT:
        db.add(Patient(user_id=user.id))
    elif data.role == UserRole.ADMIN:
        db.add(Admin(user_id=user.id))

    db.commit()
    db.refresh(user)

    return Token(
        access_token=_create_token(user.id),
        user_id=user.id,
        full_name=user.full_name,
        role=user.role.value,
        is_verified=bool(user.is_verified),
    )


@router.post("/register-doctor", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_doctor(
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    phone: str = Form(""),
    specialization: str = Form("طب الأعصاب"),
    license_number: str = Form(...),
    years_experience: int = Form(0),
    cv_file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    """Register a doctor account (multipart — includes CV upload)."""
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "البريد الإلكتروني مستخدم مسبقاً")
    if len(password) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "كلمة المرور يجب أن تكون 6 أحرف على الأقل")

    user = User(
        email=email,
        hashed_password=_hash(password),
        full_name=full_name,
        phone=phone,
        role=UserRole.DOCTOR,
    )
    db.add(user)
    db.flush()

    cv_path: str | None = None
    if cv_file and cv_file.filename:
        cv_path = save_upload(cv_file, subfolder="cvs")

    db.add(Doctor(
        user_id=user.id,
        specialization=specialization,
        license_number=license_number,
        years_experience=years_experience,
        cv_file=cv_path,
        is_approved=False,
    ))
    db.commit()
    db.refresh(user)

    return Token(
        access_token=_create_token(user.id),
        user_id=user.id,
        full_name=user.full_name,
        role=user.role.value,
        is_approved=False,
        is_verified=bool(user.is_verified),
    )


# ── Login ──────────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate any role."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not _verify(data.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "بريد إلكتروني أو كلمة مرور خاطئة")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "الحساب موقوف — تواصل مع الإدارة")

    is_approved: bool | None = None
    if user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        is_approved = bool(doctor and doctor.is_approved)

    return Token(
        access_token=_create_token(user.id),
        user_id=user.id,
        full_name=user.full_name,
        role=user.role.value,
        is_approved=is_approved,
        is_verified=bool(user.is_verified),
    )


# ── Profile ────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_profile(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.get("full_name"):
        current_user.full_name = data["full_name"]
    if data.get("phone"):
        current_user.phone = data["phone"]
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserOut)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload or replace the current user's profile picture."""
    from app.utils.file_utils import ALLOWED_IMAGE_TYPES
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "نوع الملف غير مدعوم — الرجاء رفع صورة بصيغة JPEG أو PNG أو WebP",
        )
    current_user.profile_image = save_upload(file, subfolder="avatars")
    db.commit()
    db.refresh(current_user)
    return current_user


class _ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    data: _ChangePasswordBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _verify(data.current_password, current_user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "كلمة المرور الحالية غير صحيحة")
    if len(data.new_password) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "كلمة المرور الجديدة قصيرة جداً")
    current_user.hashed_password = _hash(data.new_password)
    db.commit()
    return {"message": "تم تغيير كلمة المرور بنجاح"}


# ── OTP — Send ─────────────────────────────────────────────────────────────

class _SendOTPBody(BaseModel):
    identifier: str   # email address or phone number
    method: str       # "email" | "sms"
    purpose: str      # "verify" | "reset"


@router.post("/send-otp")
async def send_otp(data: _SendOTPBody, db: Session = Depends(get_db)):
    """
    Send a 6-digit OTP to the given email or phone.
    For purpose="reset", returns success even if identifier not found (security).
    """
    if data.purpose not in ("verify", "reset"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "غرض غير صالح")
    if data.method not in ("email", "sms"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "طريقة إرسال غير صالحة")

    identifier = data.identifier.strip()

    # For password reset: silently succeed if user not found to prevent enumeration
    if data.purpose == "reset":
        if data.method == "email":
            user = db.query(User).filter(User.email == identifier).first()
        else:
            user = db.query(User).filter(User.phone == identifier).first()
        if not user:
            return {"message": "إذا كان الحساب موجوداً، سيتم إرسال رمز التحقق", "expires_in": _OTP_EXPIRY_MINUTES * 60}

    # Rate limit: max 3 active (unused/unexpired) OTPs per identifier per purpose
    active_count = db.query(OTPToken).filter(
        OTPToken.identifier == identifier,
        OTPToken.purpose    == data.purpose,
        OTPToken.is_used    == False,
        OTPToken.expires_at >  datetime.utcnow(),
    ).count()
    if active_count >= 3:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "تجاوزت عدد الطلبات المسموحة، انتظر قليلاً")

    # Invalidate any previous unused OTPs for this identifier+purpose
    _invalidate_old_otps(db, identifier, data.purpose)

    # Create new OTP record
    code    = _generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=_OTP_EXPIRY_MINUTES)
    otp     = OTPToken(
        identifier=identifier,
        code=code,
        purpose=OTPPurpose(data.purpose),
        expires_at=expires,
    )
    db.add(otp)
    db.commit()

    # Dev mode — skip real sending, return code directly
    if settings.DEV_MODE:
        return {
            "message": "وضع التطوير — الرمز متاح مباشرةً",
            "expires_in": _OTP_EXPIRY_MINUTES * 60,
            "dev_code": code,
        }

    # Production — dispatch via email or SMS
    if data.method == "email":
        try:
            from app.utils.email_service import send_otp_email
            await send_otp_email(identifier, code, data.purpose)
        except Exception as exc:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                                f"تعذّر إرسال البريد الإلكتروني — {exc}")
    else:
        from app.utils.sms_service import send_otp_sms
        sent = send_otp_sms(identifier, code, data.purpose)
        if not sent:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                                "خدمة SMS غير متاحة حالياً — جرّب البريد الإلكتروني")

    return {"message": "تم إرسال رمز التحقق بنجاح", "expires_in": _OTP_EXPIRY_MINUTES * 60}


# ── OTP — Verify (email/phone confirmation after registration) ─────────────

class _VerifyOTPBody(BaseModel):
    identifier: str
    code: str
    purpose: str   # "verify"


@router.post("/verify-otp")
def verify_otp(data: _VerifyOTPBody, db: Session = Depends(get_db)):
    """Verify an OTP code and, for purpose='verify', mark the user as verified."""
    if data.purpose not in ("verify", "reset"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "غرض غير صالح")

    identifier = data.identifier.strip()
    now        = datetime.utcnow()

    otp = (
        db.query(OTPToken)
        .filter(
            OTPToken.identifier == identifier,
            OTPToken.purpose    == data.purpose,
            OTPToken.is_used    == False,
            OTPToken.expires_at >  now,
        )
        .order_by(OTPToken.created_at.desc())
        .first()
    )

    if not otp:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "الرمز منتهي الصلاحية أو غير موجود — اطلب رمزاً جديداً")

    otp.attempts += 1
    if otp.attempts > _OTP_MAX_ATTEMPTS:
        otp.is_used = True
        db.commit()
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "تجاوزت عدد المحاولات — اطلب رمزاً جديداً")

    if otp.code != data.code:
        db.commit()
        remaining = _OTP_MAX_ATTEMPTS - otp.attempts
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"رمز التحقق غير صحيح — {remaining} محاولات متبقية")

    otp.is_used = True

    if data.purpose == "verify":
        user = db.query(User).filter(
            or_(User.email == identifier, User.phone == identifier)
        ).first()
        if user:
            user.is_verified = True

    db.commit()
    return {"message": "تم التحقق بنجاح"}


# ── Password Reset ─────────────────────────────────────────────────────────

class _ResetPasswordBody(BaseModel):
    identifier: str
    code: str
    new_password: str


@router.post("/reset-password")
def reset_password(data: _ResetPasswordBody, db: Session = Depends(get_db)):
    """Verify reset OTP and update the password in one step."""
    if len(data.new_password) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "كلمة المرور يجب أن تكون 6 أحرف على الأقل")

    identifier = data.identifier.strip()
    now        = datetime.utcnow()

    otp = (
        db.query(OTPToken)
        .filter(
            OTPToken.identifier == identifier,
            OTPToken.purpose    == "reset",
            OTPToken.is_used    == False,
            OTPToken.expires_at >  now,
        )
        .order_by(OTPToken.created_at.desc())
        .first()
    )

    if not otp:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "الرمز منتهي الصلاحية أو غير موجود — اطلب رمزاً جديداً")

    otp.attempts += 1
    if otp.attempts > _OTP_MAX_ATTEMPTS:
        otp.is_used = True
        db.commit()
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "تجاوزت عدد المحاولات — اطلب رمزاً جديداً")

    if otp.code != data.code:
        db.commit()
        remaining = _OTP_MAX_ATTEMPTS - otp.attempts
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"رمز التحقق غير صحيح — {remaining} محاولات متبقية")

    user = db.query(User).filter(
        or_(User.email == identifier, User.phone == identifier)
    ).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المستخدم غير موجود")

    user.hashed_password = _hash(data.new_password)
    otp.is_used = True
    db.commit()

    return {"message": "تم تغيير كلمة المرور بنجاح — يمكنك تسجيل الدخول الآن"}
