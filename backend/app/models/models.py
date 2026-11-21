from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # เป็น Null ได้ถ้าสมัครผ่าน Google
    oauth_provider = Column(String(50), default="local")  # "local" หรือ "google"
    is_verified = Column(Boolean, default=False)          # True เมื่อยืนยัน OTP หรือผ่าน Google
    created_at = Column(DateTime, default=utcnow)

    collections = relationship("Collection", back_populates="owner", cascade="all, delete-orphan")

class OTPCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    code = Column(String(6), nullable=False)
    purpose = Column(String(30), nullable=False)  # "register" หรือ "reset_password"
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)

class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    owner = relationship("User", back_populates="collections")
    documents = relationship("Document", back_populates="collection", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="collection", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    summary_wiki = Column(Text, nullable=True)  # เก็บสรุปภาพรวมสไตล์ LLM Wiki
    created_at = Column(DateTime, default=utcnow)

    collection = relationship("Collection", back_populates="documents")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=False)
    role = Column(String(20), nullable=False)  # "user" หรือ "assistant"
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True)    # เก็บชื่อไฟล์และเลขหน้าที่ AI ใช้อ้างอิง
    created_at = Column(DateTime, default=utcnow)

    collection = relationship("Collection", back_populates="messages")