import os
import json
from mcp.server.fastmcp import FastMCP
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import Collection, Document
from app.services.rag_service import (
    _ensure_all_docs_indexed,
    _retrieve_cross_file_chunks,
)

mcp = FastMCP("Textspace Knowledge Base")


@mcp.tool()
def list_textspace_collections() -> str:
    """แสดงรายการโปรเจค/คอลเลกชันเอกสารทั้งหมดที่มีอยู่ใน Textspace"""
    db = SessionLocal()
    try:
        cols = db.query(Collection).order_by(Collection.updated_at.desc()).all()
        items = [
            {
                "collection_id": c.id,
                "name": c.name,
                "description": c.description or "",
                "document_count": len(c.documents),
                "documents": [d.filename for d in c.documents],
            }
            for c in cols
        ]
        return json.dumps(items, ensure_ascii=False, indent=2)
    finally:
        db.close()


@mcp.tool()
def get_collection_llm_wiki(collection_id: int) -> str:
    """ดึงเอกสารสรุปภาพรวม (LLM Wiki) ที่สังเคราะห์รวมจากทุกไฟล์ในโปรเจค"""
    wiki_path = os.path.join(
        settings.UPLOAD_DIR, f"collection_{collection_id}_combined_wiki.md"
    )
    if os.path.exists(wiki_path):
        with open(wiki_path, "r", encoding="utf-8") as f:
            return f.read()

    db = SessionLocal()
    try:
        docs = (
            db.query(Document)
            .filter(Document.collection_id == collection_id)
            .all()
        )
        for d in docs:
            if d.summary_wiki:
                return d.summary_wiki
        return f"ไม่พบข้อมูล LLM Wiki สำหรับ collection_id={collection_id}"
    finally:
        db.close()


@mcp.tool()
def search_textspace_documents(
    collection_id: int,
    query: str,
    top_k: int = 8,
) -> str:
    """ค้นหาเนื้อหาเชิงลึกข้ามทุกไฟล์ในโปรเจคของ Textspace ด้วย Semantic Vector Search"""
    db = SessionLocal()
    try:
        docs = (
            db.query(Document)
            .filter(Document.collection_id == collection_id)
            .all()
        )
        if not docs:
            return f"ไม่พบเอกสารใน collection_id={collection_id}"

        records = [
            {
                "id": d.id,
                "filename": d.filename,
                "file_path": d.file_path,
                "file_type": d.file_type,
            }
            for d in docs
        ]
        _ensure_all_docs_indexed(collection_id, records)
        chunks = _retrieve_cross_file_chunks(
            collection_id=collection_id,
            query_text=query,
            total_k=max(1, min(top_k, 20)),
        )
        results = [
            {
                "filename": c["filename"],
                "page": c["page"],
                "excerpt": c["text"],
            }
            for c in chunks
        ]
        return json.dumps(results, ensure_ascii=False, indent=2)
    finally:
        db.close()


if __name__ == "__main__":
    mcp.run()