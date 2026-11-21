from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

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
    doc_id: int
    filename: str
    page: int
    snippet: str

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