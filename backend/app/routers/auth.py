from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import (
    AuthTokenResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    MessageResponse,
    ResendOtpRequest,
    SignupRequest,
    UserResponse,
    VerifyOtpRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest):
    try:
        auth_service.register_pending_user(
            username=payload.username,
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            password=payload.password,
        )
        return MessageResponse(message="ส่งรหัสยืนยัน OTP ไปยังอีเมลเรียบร้อยแล้ว")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/verify-otp", response_model=MessageResponse)
def verify_otp(payload: VerifyOtpRequest):
    try:
        auth_service.verify_user_otp(email=payload.email, otp_code=payload.otp_code)
        return MessageResponse(message="ยืนยันตัวตนสำเร็จ บัญชีพร้อมใช้งานแล้ว")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/resend-otp", response_model=MessageResponse)
def resend_otp(payload: ResendOtpRequest):
    try:
        auth_service.resend_user_otp(email=payload.email)
        return MessageResponse(message="ส่งรหัส OTP ใหม่เรียบร้อยแล้ว")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: LoginRequest):
    try:
        user = auth_service.authenticate_user(email=payload.email, password=payload.password)
        token = auth_service.create_user_token(
            user_id=user["id"],
            email=user["email"],
            remember_me=payload.remember_me,
        )
        return AuthTokenResponse(
            access_token=token,
            user=UserResponse(
                id=user["id"],
                username=user["username"],
                first_name=user["first_name"],
                last_name=user["last_name"],
                email=user["email"],
            ),
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest):
    # ตอบกลับข้อความกลางเสมอเพื่อป้องกันการสุ่มเช็กอีเมลในระบบ (User Enumeration)
    print(f"\n[DEV RESET] Password reset requested for: {payload.email}\n")
    return MessageResponse(
        message="หากอีเมลนี้ลงทะเบียนในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้เรียบร้อยแล้ว"
    )

@router.post("/google", response_model=AuthTokenResponse)
def google_auth(payload: GoogleAuthRequest):
    try:
        user = auth_service.authenticate_google_user(credential=payload.credential)
        token = auth_service.create_user_token(
            user_id=user["id"],
            email=user["email"],
            remember_me=True,
        )
        return AuthTokenResponse(
            access_token=token,
            user=UserResponse(
                id=user["id"],
                username=user["username"],
                first_name=user["first_name"],
                last_name=user["last_name"],
                email=user["email"],
            ),
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))