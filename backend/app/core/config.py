import os
from datetime import datetime, timedelta, timezone
import bcrypt
from dotenv import load_dotenv
from jose import JWTError, jwt

load_dotenv()


class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "AI Document Workspace")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Auth & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-to-a-long-random-secret-key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", ALGORITHM)
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", str(ACCESS_TOKEN_EXPIRE_MINUTES)))

    # AI & OAuth
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "openai/gpt-4o-mini")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    # SMTP สำหรับส่งอีเมล OTP
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@Textspace.local")

    smtp_host: str = SMTP_HOST
    smtp_port: int = SMTP_PORT
    smtp_user: str = SMTP_USER
    smtp_password: str = SMTP_PASSWORD
    smtp_from_email: str = SMTP_FROM_EMAIL
    frontend_url: str = FRONTEND_URL

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    supabase_url: str = SUPABASE_URL
    supabase_anon_key: str = SUPABASE_ANON_KEY
    supabase_service_role_key: str = SUPABASE_SERVICE_ROLE_KEY

    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "../storage/uploads")


settings = Settings()


def get_settings() -> Settings:
    return settings


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None