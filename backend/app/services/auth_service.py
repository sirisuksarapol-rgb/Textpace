from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import re
import secrets
import smtplib
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from app.core.config import (
    create_access_token as encode_jwt_token,
    hash_password,
    settings,
    verify_password,
)
from app.db.supabase import get_supabase_admin


def create_user_token(user_id: str, email: str, remember_me: bool = True) -> str:
    expire_delta = (
        timedelta(days=7)
        if remember_me
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return encode_jwt_token({"sub": user_id, "email": email}, expires_delta=expire_delta)


def _send_html_email(to_email: str, subject: str, plain_text: str, html_body: str) -> bool:
    if not (settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD):
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"Textspace <{settings.SMTP_FROM_EMAIL or settings.SMTP_USER}>"
    msg["To"] = to_email
    msg.set_content(plain_text)
    msg.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
    return True


def generate_and_send_otp(email: str) -> str:
    supabase = get_supabase_admin()
    email_key = email.lower().strip()
    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()

    supabase.table("email_otps").upsert(
        {
            "email": email_key,
            "otp_code": otp_code,
            "expires_at": expires_at,
        }
    ).execute()

    plain_text = f"รหัสยืนยัน OTP สำหรับ Textspace ของคุณคือ: {otp_code} (มีอายุการใช้งาน 30 นาที)"
    html_body = f"""
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 6px 14px; background-color: #eff6ff; color: #2563eb; font-weight: 700; font-size: 13px; border-radius: 999px;">
          Textspace VERIFICATION
        </span>
      </div>
      <div style="background-color: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
        <h2 style="margin: 0 0 8px; color: #0f172a; font-size: 20px;">ยืนยันอีเมลของคุณ</h2>
        <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.5;">
          กรุณานำรหัส OTP 6 หลักด้านล่างนี้ไปกรอกในหน้าสมัครสมาชิกเพื่อเปิดใช้งานบัญชี
        </p>
        <div style="padding: 16px; background-color: #f1f5f9; border-radius: 10px; font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8;">
          {otp_code}
        </div>
        <p style="margin: 20px 0 0; color: #94a3b8; font-size: 12px;">
          รหัสนี้มีอายุการใช้งาน 30 นาที หากคุณไม่ได้ทำรายการนี้สามารถละเว้นอีเมลฉบับนี้ได้
        </p>
      </div>
    </div>
    """

    sent = _send_html_email(
        to_email=email_key,
        subject=f"[{otp_code}] รหัสยืนยัน OTP สำหรับ Textspace",
        plain_text=plain_text,
        html_body=html_body,
    )
    if not sent:
        print(f"\n[DEV OTP] Email: {email_key} -> OTP Code: {otp_code}\n")

    return otp_code


def register_pending_user(
    username: str,
    first_name: str,
    last_name: str,
    email: str,
    password: str,
) -> None:
    supabase = get_supabase_admin()
    email_key = email.lower().strip()
    username_clean = username.strip()

    email_res = (
        supabase.table("users")
        .select("id, is_verified")
        .eq("email", email_key)
        .limit(1)
        .execute()
    )
    existing_email_user = email_res.data[0] if email_res.data else None

    if existing_email_user and existing_email_user.get("is_verified"):
        raise ValueError("อีเมลนี้ถูกใช้งานแล้ว")

    username_res = (
        supabase.table("users")
        .select("id, email, is_verified")
        .ilike("username", username_clean)
        .limit(1)
        .execute()
    )
    existing_username_user = username_res.data[0] if username_res.data else None

    if existing_username_user and existing_username_user["email"] != email_key:
        raise ValueError("ชื่อผู้ใช้งานนี้ถูกใช้งานแล้ว")

    user_payload = {
        "username": username_clean,
        "first_name": first_name.strip(),
        "last_name": last_name.strip(),
        "email": email_key,
        "password_hash": hash_password(password),
        "is_verified": False,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    if existing_email_user:
        supabase.table("users").update(user_payload).eq("id", existing_email_user["id"]).execute()
    else:
        supabase.table("users").insert(user_payload).execute()

    generate_and_send_otp(email_key)


def verify_user_otp(email: str, otp_code: str) -> dict:
    supabase = get_supabase_admin()
    email_key = email.lower().strip()

    user_res = (
        supabase.table("users")
        .select("id, username, first_name, last_name, email, is_verified")
        .eq("email", email_key)
        .limit(1)
        .execute()
    )
    if not user_res.data:
        raise ValueError("ไม่พบข้อมูลการสมัครสมาชิกของอีเมลนี้")

    otp_res = (
        supabase.table("email_otps")
        .select("otp_code, expires_at")
        .eq("email", email_key)
        .limit(1)
        .execute()
    )
    if not otp_res.data:
        raise ValueError("ไม่พบรหัส OTP กรุณากดขอรหัสใหม่อีกครั้ง")

    otp_record = otp_res.data[0]
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))

    if datetime.now(timezone.utc) > expires_at:
        supabase.table("email_otps").delete().eq("email", email_key).execute()
        raise ValueError("รหัส OTP หมดอายุแล้ว กรุณากดขอรหัสใหม่")

    if otp_record["otp_code"] != otp_code:
        raise ValueError("รหัส OTP ไม่ถูกต้อง")

    updated_res = (
        supabase.table("users")
        .update({"is_verified": True, "updated_at": datetime.now(timezone.utc).isoformat()})
        .eq("email", email_key)
        .execute()
    )
    supabase.table("email_otps").delete().eq("email", email_key).execute()
    return updated_res.data[0]


def resend_user_otp(email: str) -> None:
    supabase = get_supabase_admin()
    email_key = email.lower().strip()

    user_res = (
        supabase.table("users")
        .select("id, is_verified")
        .eq("email", email_key)
        .limit(1)
        .execute()
    )
    if not user_res.data:
        raise ValueError("ไม่พบบัญชีผู้ใช้งานที่รอการยืนยัน")
    if user_res.data[0].get("is_verified"):
        raise ValueError("บัญชีนี้ได้รับการยืนยันเรียบร้อยแล้ว")

    generate_and_send_otp(email_key)


def authenticate_user(email: str, password: str) -> dict:
    supabase = get_supabase_admin()
    email_key = email.lower().strip()

    user_res = (
        supabase.table("users")
        .select("id, username, first_name, last_name, email, password_hash, is_verified")
        .eq("email", email_key)
        .limit(1)
        .execute()
    )
    user = user_res.data[0] if user_res.data else None

    if not user or not user.get("password_hash") or not verify_password(password, user["password_hash"]):
        raise ValueError("อีเมลหรือรหัสผ่านไม่ถูกต้อง")

    if not user.get("is_verified"):
        raise PermissionError("บัญชีนี้ยังไม่ได้ยืนยันรหัส OTP")

    return user


def authenticate_google_user(credential: str) -> dict:
    google_client_id = (settings.GOOGLE_CLIENT_ID or "").strip().strip('"').strip("'")
    if not google_client_id:
        raise RuntimeError("ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID ในไฟล์ .env")

    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            google_client_id,
            clock_skew_in_seconds=10,
        )
    except Exception as exc:
        print(f"[GOOGLE AUTH ERROR] client_id={google_client_id[:15]}... | error={exc}")
        raise ValueError(f"Google OAuth Error: {exc}")
    if not settings.GOOGLE_CLIENT_ID:
        raise RuntimeError("ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID ในไฟล์ .env")

    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise ValueError("ไม่สามารถยืนยันตัวตนกับ Google ได้ กรุณาลองใหม่อีกครั้ง")

    google_sub = idinfo["sub"]
    email_key = idinfo["email"].lower().strip()
    first_name = idinfo.get("given_name") or email_key.split("@")[0]
    last_name = idinfo.get("family_name") or ""

    supabase = get_supabase_admin()
    user_res = (
        supabase.table("users")
        .select("id, username, first_name, last_name, email, google_id, is_verified")
        .eq("email", email_key)
        .limit(1)
        .execute()
    )
    existing_user = user_res.data[0] if user_res.data else None

    if existing_user:
        updated = (
            supabase.table("users")
            .update(
                {
                    "google_id": google_sub,
                    "is_verified": True,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("id", existing_user["id"])
            .execute()
        )
        return updated.data[0]

    base_username = re.sub(r"[^a-zA-Z0-9_]", "", email_key.split("@")[0]) or "user"
    username_candidate = base_username
    suffix = 1
    while True:
        check = (
            supabase.table("users")
            .select("id")
            .ilike("username", username_candidate)
            .limit(1)
            .execute()
        )
        if not check.data:
            break
        username_candidate = f"{base_username}_{suffix}"
        suffix += 1

    created = (
        supabase.table("users")
        .insert(
            {
                "username": username_candidate,
                "first_name": first_name,
                "last_name": last_name,
                "email": email_key,
                "google_id": google_sub,
                "is_verified": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .execute()
    )
    return created.data[0]


def request_password_reset(email: str) -> None:
    supabase = get_supabase_admin()
    email_key = email.lower().strip()

    user_res = (
        supabase.table("users")
        .select("id, is_verified")
        .eq("email", email_key)
        .limit(1)
        .execute()
    )
    if not user_res.data or not user_res.data[0].get("is_verified"):
        return

    reset_token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()

    supabase.table("password_resets").upsert(
        {
            "email": email_key,
            "reset_token": reset_token,
            "expires_at": expires_at,
        }
    ).execute()

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    plain_text = f"คลิกลิงก์เพื่อตั้งรหัสผ่านใหม่สำหรับ Textspace (อายุ 30 นาที): {reset_link}"
    html_body = f"""
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="background-color: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
        <h2 style="margin: 0 0 10px; color: #0f172a; font-size: 20px;">รีเซ็ตรหัสผ่าน Textspace</h2>
        <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.5;">
          เราได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ กดปุ่มด้านล่างเพื่อดำเนินการต่อ
        </p>
        <a href="{reset_link}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 10px;">
          ตั้งรหัสผ่านใหม่
        </a>
        <p style="margin: 22px 0 0; color: #94a3b8; font-size: 12px;">
          ลิงก์นี้มีอายุการใช้งาน 30 นาที หากคุณไม่ได้เป็นผู้ร้องขอ สามารถเพิกเฉยต่ออีเมลนี้ได้
        </p>
      </div>
    </div>
    """

    sent = _send_html_email(
        to_email=email_key,
        subject="คำขอตั้งรหัสผ่านใหม่สำหรับบัญชี Textspace",
        plain_text=plain_text,
        html_body=html_body,
    )
    if not sent:
        print(f"\n[DEV RESET LINK] Email: {email_key} -> {reset_link}\n")


def confirm_password_reset(token: str, new_password: str) -> None:
    supabase = get_supabase_admin()

    reset_res = (
        supabase.table("password_resets")
        .select("email, expires_at")
        .eq("reset_token", token)
        .limit(1)
        .execute()
    )
    if not reset_res.data:
        raise ValueError("ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือถูกใช้งานไปแล้ว")

    record = reset_res.data[0]
    expires_at = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        supabase.table("password_resets").delete().eq("reset_token", token).execute()
        raise ValueError("ลิงก์รีเซ็ตรหัสผ่านหมดอายุแล้ว กรุณาทำรายการใหม่อีกครั้ง")

    supabase.table("users").update(
        {
            "password_hash": hash_password(new_password),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("email", record["email"]).execute()

    supabase.table("password_resets").delete().eq("reset_token", token).execute()