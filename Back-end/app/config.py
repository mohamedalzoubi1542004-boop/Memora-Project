"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central settings object — all values come from the .env file."""

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # File storage
    UPLOAD_DIR: str = "./uploads"
    REPORTS_DIR: str = "./reports"

    # Email — Resend (resend.com) — primary sender
    RESEND_API_KEY: str = ""          # re_xxxxxxxxxxxx
    RESEND_FROM: str = "Memora <onboarding@resend.dev>"  # change to your domain after verification

    # Email — SMTP fallback (Gmail etc.) — used only if RESEND_API_KEY is empty
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587

    # SMS — Twilio (optional; leave empty to disable SMS OTP)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_FROM: str = ""

    # Development mode — returns OTP code in response instead of sending email/SMS
    DEV_MODE: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
