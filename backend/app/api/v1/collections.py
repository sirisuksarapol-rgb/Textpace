import os
import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.models import User, Collection, Document, ChatMessage
from app.schemas.workspace import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    DocumentResponse,
    ChatRequest,
    ChatMessageResponse,
)
from app.api.deps import get_current_user
from app.services.rag_service import (
    extract_pages_from_file,
    index_document_to_vector_db,
    delete_document_from_vector_db,
    delete_collection_from_vector_db,
    generate_combined_wiki_summary,
    stream_rag_answer,
)

router = APIRouter(prefix="/collections", tags=["Collections & Workspace"])

ALLOWED_EXTENSIONS = {"pdf", "txt", "md", "csv"}


def _get_user_collection(db: Session, collection_id: int, user_id: str | int) -> Collection:
    col = (
        db.query(Collection)
        .filter(Collection.id == collection_id, Collection.user_id == user_id)
        .first()
    )
    if not col:
        raise HTTPException(status_code=404, detail="ไม่พบคอลเลกชันหรือคุณไม่มีสิทธิ์เข้าถึง")
    return col


def _get_combined_wiki_path(collection_id: int) -> str:
    return os.path.join(settings.UPLOAD_DIR, f"collection_{collection_id}_combined_wiki.md")


def _read_combined_wiki(collection_id: int) -> str:
    wiki_path = _get_combined_wiki_path(collection_id)
    if os.path.exists(wiki_path):
        with open(wiki_path, "r", encoding="utf-8") as f:
            return f.read()
    return ""


async def _rebuild_combined_project_wiki(col: Collection) -> str:
    """อ่านเนื้อหาจากทุกไฟล์ในคอลเลกชันมาประมวลผลและสรุปรวมกันเป็นภาพเดียว"""
    wiki_path = _get_combined_wiki_path(col.id)
    if not col.documents:
        if os.path.exists(wiki_path):
            os.remove(wiki_path)
        return ""

    all_docs_pages: list[dict] = []
    for doc in sorted(col.documents, key=lambda d: d.created_at):
        if os.path.exists(doc.file_path):
            pages = extract_pages_from_file(doc.file_path, doc.file_type)
            if pages:
                all_docs_pages.append({"filename": doc.filename, "pages": pages})

    if not all_docs_pages:
        return ""

    combined_summary = await generate_combined_wiki_summary(col.name, all_docs_pages)
    with open(wiki_path, "w", encoding="utf-8") as f:
        f.write(combined_summary)
    return combined_summary


# ==========================================
# 1. จัดการคอลเลกชัน (Dashboard & Rename)
# ==========================================

@router.get("", response_model=List[CollectionResponse])
def list_collections(
    search: Optional[str] = Query(None, description="คำค้นหาชื่อคอลเลกชัน"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Collection).filter(Collection.user_id == current_user.id)
    if search:
        query = query.filter(Collection.name.ilike(f"%{search}%"))

    collections = query.order_by(Collection.updated_at.desc()).all()
    results = []
    for c in collections:
        item = CollectionResponse.model_validate(c)
        item.document_count = len(c.documents)
        item.message_count = len(c.messages)
        results.append(item)
    return results


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(
    payload: CollectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_col = Collection(
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description,
    )
    db.add(new_col)
    db.commit()
    db.refresh(new_col)

    res = CollectionResponse.model_validate(new_col)
    res.document_count = 0
    res.message_count = 0
    return res


@router.patch("/{collection_id}", response_model=CollectionResponse)
def update_collection(
    collection_id: int,
    payload: CollectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = _get_user_collection(db, collection_id, current_user.id)
    if payload.name is not None and payload.name.strip():
        col.name = payload.name.strip()
    if payload.description is not None:
        col.description = payload.description

    db.commit()
    db.refresh(col)

    res = CollectionResponse.model_validate(col)
    res.document_count = len(col.documents)
    res.message_count = len(col.messages)
    return res


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = _get_user_collection(db, collection_id, current_user.id)

    for doc in col.documents:
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)

    wiki_path = _get_combined_wiki_path(col.id)
    if os.path.exists(wiki_path):
        os.remove(wiki_path)

    delete_collection_from_vector_db(col.id)
    db.delete(col)
    db.commit()
    return None


@router.get("/{collection_id}/wiki")
async def get_collection_combined_wiki(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """ดึงสรุปองค์ความรู้ที่สังเคราะห์รวมจากทุกไฟล์ในคอลเลกชัน"""
    col = _get_user_collection(db, collection_id, current_user.id)
    combined = _read_combined_wiki(col.id)
    if not combined and col.documents:
        combined = await _rebuild_combined_project_wiki(col)
    return {"summary_wiki": combined, "file_count": len(col.documents)}


# ==========================================================
# 2. จัดการไฟล์เอกสาร (อัปโหลดรวมชุด + ประมวลผลรวมทุกไฟล์)
# ==========================================================

@router.get("/{collection_id}/documents", response_model=List[DocumentResponse])
def list_documents(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = _get_user_collection(db, collection_id, current_user.id)
    return sorted(col.documents, key=lambda d: d.created_at, reverse=True)


@router.post("/{collection_id}/documents", response_model=List[DocumentResponse], status_code=status.HTTP_201_CREATED)
async def upload_documents_batch(
    collection_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """รับหลายไฟล์พร้อมกัน นำเข้า Vector DB ชุดเดียวกัน และประมวลผลสรุปรวมทุกไฟล์ในครั้งเดียว"""
    col = _get_user_collection(db, collection_id, current_user.id)
    if not files:
        raise HTTPException(status_code=400, detail="กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์")

    staged_items: list[dict] = []

    try:
        # 1. ตรวจสอบและสกัดข้อความจากทุกไฟล์ที่ส่งเข้ามาพร้อมกัน
        for upload in files:
            if not upload.filename or "." not in upload.filename:
                raise HTTPException(status_code=400, detail=f"ชื่อไฟล์ไม่ถูกต้อง: {upload.filename}")

            ext = upload.filename.rsplit(".", 1)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"ไฟล์ {upload.filename} ไม่รองรับ (รองรับเฉพาะ {', '.join(ALLOWED_EXTENSIONS)})",
                )

            unique_name = f"{uuid.uuid4().hex}.{ext}"
            saved_path = os.path.join(settings.UPLOAD_DIR, unique_name)

            content_bytes = await upload.read()
            with open(saved_path, "wb") as f:
                f.write(content_bytes)

            pages = extract_pages_from_file(saved_path, ext)
            if not pages:
                os.remove(saved_path)
                raise HTTPException(
                    status_code=400,
                    detail=f"ไม่พบข้อความในไฟล์ {upload.filename} (อาจเป็น PDF แบบสแกนรูปภาพ)",
                )

            staged_items.append(
                {
                    "filename": upload.filename,
                    "saved_path": saved_path,
                    "ext": ext,
                    "pages": pages,
                }
            )

        # 2. บันทึกข้อมูลไฟล์ทั้งหมดลง Database และ Index เข้า ChromaDB ใน Collection เดียวกัน
        created_docs: list[Document] = []
        for item in staged_items:
            new_doc = Document(
                collection_id=col.id,
                filename=item["filename"],
                file_path=item["saved_path"],
                file_type=item["ext"],
                summary_wiki="",
            )
            db.add(new_doc)
            db.flush()

            index_document_to_vector_db(
                collection_id=col.id,
                doc_id=new_doc.id,
                filename=new_doc.filename,
                pages=item["pages"],
            )
            created_docs.append(new_doc)

        db.commit()
        for d in created_docs:
            db.refresh(d)

        # 3. ประมวลผลสรุปภาพรวมจากทุกไฟล์ในโปรเจครวมกันครั้งเดียว
        db.refresh(col)
        combined_wiki = await _rebuild_combined_project_wiki(col)
        for d in col.documents:
            d.summary_wiki = combined_wiki
        db.commit()

        return created_docs

    except HTTPException:
        db.rollback()
        for item in staged_items:
            if os.path.exists(item["saved_path"]):
                os.remove(item["saved_path"])
        raise
    except Exception as exc:
        db.rollback()
        for item in staged_items:
            if os.path.exists(item["saved_path"]):
                os.remove(item["saved_path"])
        raise HTTPException(status_code=500, detail=f"ประมวลผลเอกสารไม่สำเร็จ: {str(exc)}")


@router.get("/{collection_id}/documents/{doc_id}/file")
def view_document_file(
    collection_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_user_collection(db, collection_id, current_user.id)
    doc = (
        db.query(Document)
        .filter(Document.id == doc_id, Document.collection_id == collection_id)
        .first()
    )

    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์เอกสาร")

    media_type = "application/pdf" if doc.file_type == "pdf" else "text/plain; charset=utf-8"
    return FileResponse(path=doc.file_path, media_type=media_type, filename=doc.filename)


@router.delete("/{collection_id}/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    collection_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = _get_user_collection(db, collection_id, current_user.id)
    doc = (
        db.query(Document)
        .filter(Document.id == doc_id, Document.collection_id == collection_id)
        .first()
    )

    if not doc:
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์เอกสาร")

    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    delete_document_from_vector_db(doc.id)
    db.delete(doc)
    db.commit()

    # อัปเดตสรุปรวมของโปรเจคใหม่ตามไฟล์ที่เหลืออยู่
    db.refresh(col)
    combined_wiki = await _rebuild_combined_project_wiki(col)
    for d in col.documents:
        d.summary_wiki = combined_wiki
    db.commit()
    return None


# ==========================================
# 3. แชทกับ AI (RAG ข้ามทุกไฟล์ในโปรเจคพร้อมกัน)
# ==========================================

@router.get("/{collection_id}/messages", response_model=List[ChatMessageResponse])
def get_chat_history(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = _get_user_collection(db, collection_id, current_user.id)
    return sorted(col.messages, key=lambda m: m.created_at)


@router.delete("/{collection_id}/messages", status_code=status.HTTP_204_NO_CONTENT)
def clear_chat_history(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = _get_user_collection(db, collection_id, current_user.id)
    db.query(ChatMessage).filter(ChatMessage.collection_id == col.id).delete()
    db.commit()
    return None


@router.post("/{collection_id}/chat")
async def chat_with_collection(
    collection_id: int,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = _get_user_collection(db, collection_id, current_user.id)

    user_msg = ChatMessage(
        collection_id=col.id,
        role="user",
        content=payload.message,
    )
    db.add(user_msg)
    db.commit()

    history = [
        {"role": m.role, "content": m.content}
        for m in sorted(col.messages, key=lambda m: m.created_at)
        if m.id != user_msg.id
    ]

    # ส่งรายการไฟล์ทั้งหมดในโปรเจคให้ RAG ตรวจสอบและสร้างบริบทภาพรวม
    doc_records = [
        {
            "id": d.id,
            "filename": d.filename,
            "file_path": d.file_path,
            "file_type": d.file_type,
        }
        for d in sorted(col.documents, key=lambda d: d.created_at)
    ]

    async def event_generator():
        full_answer = ""
        saved_citations = []

        async for event in stream_rag_answer(
            collection_id=col.id,
            user_message=payload.message,
            chat_history=history,
            model_name=payload.model,
            doc_records=doc_records,
        ):
            if event["type"] == "citations":
                saved_citations = event["citations"]
            elif event["type"] == "token":
                full_answer += event["content"]

            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

        ai_msg = ChatMessage(
            collection_id=col.id,
            role="assistant",
            content=full_answer,
            citations=saved_citations,
        )
        db.add(ai_msg)
        db.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )