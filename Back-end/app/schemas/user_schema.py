from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    role: UserRole = UserRole.PATIENT
    remember_me: bool = False   # patient only — issues a long-lived token


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False   # patient only — issues a long-lived token


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    role: str
    is_approved: bool | None = None   # only set for doctor accounts
    is_verified: bool | None = False


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: str | None
    role: str
    is_active: bool
    is_verified: bool
    profile_image: str | None = None

    class Config:
        from_attributes = True
