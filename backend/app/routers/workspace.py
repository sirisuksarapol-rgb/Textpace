from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.models.workspace import (
    WorkspaceCollection as Collection,
    WorkspaceDocument as Document,
    WorkspaceChatMessage as ChatMessage,
)
from app.api.deps import get_current_user 
from app.services.document_parser import extract_text_from_file
from app.services.openrouter_service import ask_openrouter_with_docs

router = APIRouter(prefix="/api/collections", tags=["Workspace"])


class ChatRequest(BaseModel):
    content: str
    model: str = "openai/gpt-4o-mini"


def serialize_document(doc: Document) -> dict:
    return {
        "id": doc.id,
        "name": doc.filename,
        "size": doc.file_size,
        "typeLabel": doc.file_type,
        "status": "ready",
        "previewContent": doc.extracted_text,
        "pageCount": doc.page_count,
    }


def serialize_message(msg: ChatMessage) -> dict:
    return {
        "id": msg.id,
        "role": msg.role,
        "content": msg.content,
        "modelUsed": msg.model_used,
        "citations": msg.citations or [],
        "timestamp": msg.created_at.strftime("%H:%M") if msg.created_at else "",
    }


@router.get("")
def list_collections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(Collection)
        .filter(Collection.user_id == current_user.id)
        .order_by(Collection.updated_at.desc())
        .all()
    )
    return [
        {
            "id": col.id,
            "name": col.name,
            "description": col.description or "",
            "docCount": len(col.documents),
            "messageCount": len(col.messages),
            "updatedAt": col.updated_at.strftime("%d/%m/%Y %H:%M") if col.updated_at else "",
        }
        for col in items
    ]


@router.post("")
async def create_collection(
    name: str = Form(...),
    description: str = Form(""),
    files: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_col = Collection(
        user_id=current_user.id,
        name=name.strip(),
        description=description.strip() or None,
    )
    db.add(new_col)
    db.flush()

    created_docs: list[Document] = []
    for upload in files:
        content_bytes = await upload.read()
        extracted_text, page_count, type_label = extract_text_from_file(
            upload.filename or "untitled.txt", content_bytes
        )
        doc = Document(
            collection_id=new_col.id,
            filename=upload.filename or "untitled.txt",
            file_type=type_label,
            file_size=len(content_bytes),
            page_count=page_count,
            extracted_text=extracted_text,
        )
        db.add(doc)
        created_docs.append(doc)

    db.commit()
    db.refresh(new_col)

    return {
        "id": new_col.id,
        "name": new_col.name,
        "description": new_col.description or "",
        "docCount": len(created_docs),
        "messageCount": 0,
        "documents": [serialize_document(d) for d in created_docs],
    }


@router.get("/{collection_id}")
def get_collection_detail(
    collection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = (
        db.query(Collection)
        .filter(Collection.id == collection_id, Collection.user_id == current_user.id)
        .first()
    )
    if not col:
        raise HTTPException(status_code=404, detail="ไม่พบคอลเลกชันที่ต้องการ")

    sorted_msgs = sorted(col.messages, key=lambda m: m.created_at)

    return {
        "id": col.id,
        "name": col.name,
        "description": col.description or "",
        "documents": [serialize_document(d) for d in col.documents],
        "messages": [serialize_message(m) for m in sorted_msgs],
    }


@router.post("/{collection_id}/documents")
async def upload_documents(
    collection_id: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = (
        db.query(Collection)
        .filter(Collection.id == collection_id, Collection.user_id == current_user.id)
        .first()
    )
    if not col:
        raise HTTPException(status_code=404, detail="ไม่พบคอลเลกชันที่ต้องการ")

    added_docs: list[Document] = []
    for upload in files:
        content_bytes = await upload.read()
        extracted_text, page_count, type_label = extract_text_from_file(
            upload.filename or "untitled.txt", content_bytes
        )
        doc = Document(
            collection_id=col.id,
            filename=upload.filename or "untitled.txt",
            file_type=type_label,
            file_size=len(content_bytes),
            page_count=page_count,
            extracted_text=extracted_text,
        )
        db.add(doc)
        added_docs.append(doc)

    db.commit()
    for d in added_docs:
        db.refresh(d)

    return [serialize_document(d) for d in added_docs]


@router.delete("/{collection_id}/documents/{doc_id}")
def delete_document(
    collection_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = (
        db.query(Collection)
        .filter(Collection.id == collection_id, Collection.user_id == current_user.id)
        .first()
    )
    if not col:
        raise HTTPException(status_code=404, detail="ไม่พบคอลเลกชันที่ต้องการ")

    doc = (
        db.query(Document)
        .filter(Document.id == doc_id, Document.collection_id == col.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์ที่ต้องการลบ")

    db.delete(doc)
    db.commit()
    return {"ok": True}


@router.post("/{collection_id}/chat")
async def send_chat_message(
    collection_id: str,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = (
        db.query(Collection)
        .filter(Collection.id == collection_id, Collection.user_id == current_user.id)
        .first()
    )
    if not col:
        raise HTTPException(status_code=404, detail="ไม่พบคอลเลกชันที่ต้องการ")

    question = payload.content.strip()
    if not question:
        raise HTTPException(status_code=400, detail="กรุณาพิมพ์คำถาม")

    user_msg = ChatMessage(
        collection_id=col.id,
        role="user",
        content=question,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    try:
        answer_text, citations = await ask_openrouter_with_docs(
            question=question,
            model=payload.model,
            documents=col.documents,
            history=sorted(col.messages, key=lambda m: m.created_at),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"ไม่สามารถเชื่อมต่อ AI ได้: {exc}")

    ai_msg = ChatMessage(
        collection_id=col.id,
        role="assistant",
        content=answer_text,
        model_used=payload.model,
        citations=citations,
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return {
        "userMessage": serialize_message(user_msg),
        "assistantMessage": serialize_message(ai_msg),
    }


@router.delete("/{collection_id}/chat")
def reset_chat_history(
    collection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = (
        db.query(Collection)
        .filter(Collection.id == collection_id, Collection.user_id == current_user.id)
        .first()
    )
    if not col:
        raise HTTPException(status_code=404, detail="ไม่พบคอลเลกชันที่ต้องการ")

    db.query(ChatMessage).filter(ChatMessage.collection_id == col.id).delete()
    db.commit()
    return {"ok": True}