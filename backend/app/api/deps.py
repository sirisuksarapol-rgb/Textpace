from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy import Integer, or_
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.db.supabase import get_supabase_admin
from app.models.models import User

bearer_scheme = HTTPBearer()


def _sync_user_from_supabase(db: Session, sub: str, email: str | None) -> User:
    supabase = get_supabase_admin()
    sb_user: dict = {}

    try:
        if sub:
            res = supabase.table("users").select("*").eq("id", sub).limit(1).execute()
            if res.data:
                sb_user = res.data[0]
        if not sb_user and email:
            res = supabase.table("users").select("*").eq("email", email).limit(1).execute()
            if res.data:
                sb_user = res.data[0]
    except Exception as exc:
        print(f"[AUTH SYNC WARNING] Supabase lookup failed: {exc}")

    resolved_email = (sb_user.get("email") or email or "").lower().strip()
    if not resolved_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ไม่พบข้อมูลอีเมลใน Token กรุณาเข้าสู่ระบบใหม่",
            headers={"WWW-Authenticate": "Bearer"},
        )

    existing = db.query(User).filter(User.email == resolved_email).first()
    if existing:
        return existing

    user_columns = User.__table__.columns
    base_username = (
        sb_user.get("username")
        or resolved_email.split("@")[0]
        or f"user_{sub[:8]}"
    )

    username_candidate = base_username
    suffix = 1
    if "username" in user_columns:
        while db.query(User).filter(User.username == username_candidate).first():
            username_candidate = f"{base_username}_{suffix}"
            suffix += 1

    user_kwargs: dict = {}
    if "id" in user_columns and not isinstance(user_columns["id"].type, Integer):
        user_kwargs["id"] = str(sb_user.get("id") or sub)
    if "email" in user_columns:
        user_kwargs["email"] = resolved_email
    if "username" in user_columns:
        user_kwargs["username"] = username_candidate
    if "first_name" in user_columns:
        user_kwargs["first_name"] = sb_user.get("first_name") or username_candidate
    if "last_name" in user_columns:
        user_kwargs["last_name"] = sb_user.get("last_name") or ""
    if "password_hash" in user_columns:
        user_kwargs["password_hash"] = sb_user.get("password_hash") or ""
    if "google_id" in user_columns and sb_user.get("google_id"):
        user_kwargs["google_id"] = sb_user.get("google_id")
    if "is_verified" in user_columns:
        user_kwargs["is_verified"] = bool(sb_user.get("is_verified", True))

    new_user = User(**user_kwargs)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False},
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token หมดอายุแล้ว กรุณากดออกจากระบบแล้วเข้าสู่ระบบใหม่",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token ไม่ถูกต้อง ({str(e)})",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub: str | None = payload.get("sub")
    email: str | None = payload.get("email")

    if not sub and not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ไม่พบข้อมูลระบุตัวตนใน Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    conditions = []
    if sub:
        conditions.append(User.id == str(sub))
    if email:
        conditions.append(User.email == str(email).lower().strip())

    user = db.query(User).filter(or_(*conditions)).first()
    if user is None:
        user = _sync_user_from_supabase(db, sub=str(sub or ""), email=email)

    return user