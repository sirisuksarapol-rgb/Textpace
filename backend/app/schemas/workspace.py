from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, model_validator


# --- Collection Schemas ---
class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None


class CollectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None


class CollectionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    document_count: int = 0
    message_count: int = 0

    class Config:
        from_attributes = True


# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: int
    collection_id: int
    filename: str
    file_type: str
    summary_wiki: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Chat & Citation Schemas ---
class CitationItem(BaseModel):
    doc_id: Optional[int] = None
    fileName: Optional[str] = None
    filename: Optional[str] = None
    page: int = 1
    excerpt: Optional[str] = None
    snippet: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_citation_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            name = (
                data.get("fileName")
                or data.get("filename")
                or data.get("source")
                or "เอกสารอ้างอิง"
            )
            text = (
                data.get("excerpt")
                or data.get("snippet")
                or data.get("text")
                or ""
            )
            return {
                **data,
                "fileName": name,
                "filename": name,
                "excerpt": text,
                "snippet": text,
                "page": data.get("page") or data.get("page_number") or 1,
            }
        return data


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    model: Optional[str] = None  # เผื่อผู้ใช้เลือกเปลี่ยนโมเดลในหน้าแชทได้


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    citations: Optional[List[CitationItem]] = None
    created_at: datetime

    class Config:
        from_attributes = True