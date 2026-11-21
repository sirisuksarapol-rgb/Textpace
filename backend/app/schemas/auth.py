from pydantic import BaseModel, EmailStr, Field

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

# Alias เผื่อโค้ดใหม่เรียกใช้ SignupRequest
SignupRequest = RegisterRequest

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

# เผื่อโค้ดใหม่หรือ Frontend ส่งชื่อฟิลด์เป็น otp_code
class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

class ResendOTPRequest(BaseModel):
    email: EmailStr
    purpose: str = Field(default="register")  # "register" หรือ "reset_password"

# Alias เผื่อโค้ดใหม่เรียกใช้ตัวพิมพ์เล็ก
ResendOtpRequest = ResendOTPRequest

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = True  # เพิ่มรองรับจากคู่มือ (มีค่า default ไม่กระทบของเดิม)

class GoogleLoginRequest(BaseModel):
    id_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)

class UserResponse(BaseModel):
    id: str
    username: str
    first_name: str
    last_name: str
    email: str
    oauth_provider: str = "local"
    is_verified: bool = False

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Alias เผื่อโค้ดใหม่เรียกใช้ AuthTokenResponse
AuthTokenResponse = TokenResponse

# เพิ่มใหม่จากคู่มือ
class MessageResponse(BaseModel):
    message: str
    
class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=10)