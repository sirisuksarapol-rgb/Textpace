import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class WorkspaceCollection(Base):
    __tablename__ = "workspace_collections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    documents = relationship(
        "WorkspaceDocument", back_populates="collection", cascade="all, delete-orphan"
    )
    messages = relationship(
        "WorkspaceChatMessage", back_populates="collection", cascade="all, delete-orphan"
    )


class WorkspaceDocument(Base):
    __tablename__ = "workspace_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    collection_id = Column(
        String(36), ForeignKey("workspace_collections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)
    file_size = Column(Integer, nullable=False)
    page_count = Column(Integer, default=1)
    extracted_text = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    collection = relationship("WorkspaceCollection", back_populates="documents")


class WorkspaceChatMessage(Base):
    __tablename__ = "workspace_chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    collection_id = Column(
        String(36), ForeignKey("workspace_collections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    model_used = Column(String(100), nullable=True)
    citations = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    collection = relationship("WorkspaceCollection", back_populates="messages")