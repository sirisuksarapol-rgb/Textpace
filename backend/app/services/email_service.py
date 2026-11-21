import os
import smtplib
from email.message import EmailMessage

def send_otp_email(to_email: str, code: str, purpose: str) -> None:
    subject = "รหัส OTP ยืนยันการสมัครสมาชิก" if purpose == "register" else "รหัส OTP สำหรับรีเซ็ตรหัสผ่าน"
    body = f"รหัส OTP ของคุณคือ: {code}\nรหัสนี้มีอายุการใช้งาน 5 นาที"

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    # ถ้าตั้งค่า SMTP ใน .env แล้ว ให้ส่งอีเมลจริง
    if smtp_host and smtp_user and smtp_pass:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = to_email
        msg.set_content(body)

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    else:
        # โหมดพัฒนา: แสดงรหัสใน Terminal แทนการส่งเมลจริง
        print("\n" + "=" * 50)
        print(f"[DEV EMAIL] ถึง: {to_email}")
        print(f"หัวข้อ: {subject}")
        print(f"รหัส OTP: {code}")
        print("=" * 50 + "\n")