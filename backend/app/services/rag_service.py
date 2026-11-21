import os
import json
from typing import AsyncGenerator
import chromadb
import httpx
from pypdf import PdfReader
from app.core.config import settings

CHROMA_DIR = os.path.join(settings.UPLOAD_DIR, "chroma_db")
os.makedirs(CHROMA_DIR, exist_ok=True)

_chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
_vector_collection = _chroma_client.get_or_create_collection(name="textspace_documents")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def extract_pages_from_file(file_path: str, ext: str) -> list[dict]:
    pages: list[dict] = []
    if ext == "pdf":
        reader = PdfReader(file_path)
        for idx, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            if text:
                pages.append({"page": idx, "text": text})
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            raw_text = f.read().strip()
        if raw_text:
            chunk_size = 3000
            for idx, start in enumerate(range(0, len(raw_text), chunk_size), start=1):
                pages.append({"page": idx, "text": raw_text[start : start + chunk_size]})
    return pages


def _split_text_chunks(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    cleaned = " ".join(text.split())
    if not cleaned:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(cleaned):
        end = start + chunk_size
        chunks.append(cleaned[start:end])
        if end >= len(cleaned):
            break
        start = max(0, end - overlap)
    return chunks


def index_document_to_vector_db(
    collection_id: int,
    doc_id: int,
    filename: str,
    pages: list[dict],
) -> None:
    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict] = []

    for page_item in pages:
        page_num = int(page_item["page"])
        chunks = _split_text_chunks(page_item["text"])
        for c_idx, chunk_text in enumerate(chunks):
            ids.append(f"col_{collection_id}_doc_{doc_id}_p{page_num}_c{c_idx}")
            documents.append(chunk_text)
            metadatas.append(
                {
                    "collection_id": int(collection_id),
                    "doc_id": int(doc_id),
                    "filename": filename,
                    "page": page_num,
                }
            )

    if ids:
        _vector_collection.upsert(ids=ids, documents=documents, metadatas=metadatas)


def delete_document_from_vector_db(doc_id: int) -> None:
    try:
        _vector_collection.delete(where={"doc_id": int(doc_id)})
    except Exception:
        pass


def delete_collection_from_vector_db(collection_id: int) -> None:
    try:
        _vector_collection.delete(where={"collection_id": int(collection_id)})
    except Exception:
        pass


async def generate_combined_wiki_summary(
    collection_name: str,
    all_docs_pages: list[dict],
) -> str:
    total_files = len(all_docs_pages)
    per_file_budget = max(2500, 18000 // max(1, total_files))

    merged_sections: list[str] = []
    for doc_item in all_docs_pages:
        fname = doc_item["filename"]
        doc_text = "\n".join(
            f"[หน้า {p['page']}] {p['text']}" for p in doc_item["pages"]
        )[:per_file_budget]
        merged_sections.append(f"=== เอกสาร: {fname} ===\n{doc_text}")

    combined_context = "\n\n".join(merged_sections)

    if not settings.OPENROUTER_API_KEY:
        return f"สรุปรวมเอกสารในโปรเจค '{collection_name}' ({total_files} ไฟล์)\n\n{combined_context[:4000]}"

    system_prompt = (
        "คุณคือผู้เชี่ยวชาญด้านการวิเคราะห์และสังเคราะห์เอกสารระดับโครงการ "
        "จงประมวลผลเนื้อหาจากเอกสารทั้งหมดในโปรเจคนี้ 'รวมกันเป็นภาพเดียว' "
        "ห้ามสรุปแยกทีละไฟล์แบบตัดขาดจากกัน แต่ให้เชื่อมโยงความสัมพันธ์ เปรียบเทียบข้อมูล "
        "รวมตัวเลข/ข้อกำหนดที่เกี่ยวข้องกัน และจัดทำเป็นโครงสร้าง Wiki ภาษาไทยที่อ่านง่าย ชัดเจน พร้อมระบุชื่อไฟล์อ้างอิง"
    )
    user_prompt = (
        f"ชื่อโปรเจค: {collection_name}\n"
        f"จำนวนเอกสารทั้งหมด: {total_files} ไฟล์\n\n"
        f"เนื้อหาจากทุกไฟล์:\n{combined_context}\n\n"
        "จงสังเคราะห์สรุปภาพรวมของทั้งโปรเจคจากทุกไฟล์ด้านบนรวมกัน:"
    )

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "openai/gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        return f"ไม่สามารถสร้างสรุปรวมอัตโนมัติได้ ({str(exc)})\n\nเนื้อหาเบื้องต้น:\n{combined_context[:3000]}"


async def generate_llm_wiki_summary(filename: str, pages: list[dict]) -> str:
    return await generate_combined_wiki_summary(filename, [{"filename": filename, "pages": pages}])


def _ensure_all_docs_indexed(collection_id: int, doc_records: list[dict]) -> None:
    """ตรวจสอบว่าทุกไฟล์ใน Database ถูก Index ลง ChromaDB แล้ว (ซ่อมไฟล์เก่าอัตโนมัติ)"""
    if not doc_records:
        return

    existing = _vector_collection.get(where={"collection_id": int(collection_id)})
    indexed_doc_ids = {
        int(m["doc_id"])
        for m in (existing.get("metadatas") or [])
        if isinstance(m, dict) and "doc_id" in m
    }

    for rec in doc_records:
        doc_id = int(rec["id"])
        if doc_id not in indexed_doc_ids:
            file_path = rec.get("file_path", "")
            if file_path and os.path.exists(file_path):
                pages = extract_pages_from_file(file_path, rec.get("file_type", "pdf"))
                if pages:
                    index_document_to_vector_db(
                        collection_id=int(collection_id),
                        doc_id=doc_id,
                        filename=rec["filename"],
                        pages=pages,
                    )


def _retrieve_cross_file_chunks(collection_id: int, query_text: str, total_k: int = 12) -> list[dict]:
    existing = _vector_collection.get(where={"collection_id": int(collection_id)})
    all_metadatas = existing.get("metadatas") or []
    if not all_metadatas:
        return []

    distinct_doc_ids = sorted({int(m["doc_id"]) for m in all_metadatas if "doc_id" in m})
    num_docs = len(distinct_doc_ids)

    selected_chunks: list[dict] = []
    seen_ids: set[str] = set()

    per_doc_k = max(2, total_k // max(1, num_docs))
    for doc_id in distinct_doc_ids:
        res = _vector_collection.query(
            query_texts=[query_text],
            n_results=per_doc_k,
            where={"$and": [{"collection_id": int(collection_id)}, {"doc_id": doc_id}]},
        )
        ids_list = (res.get("ids") or [[]])[0]
        docs_list = (res.get("documents") or [[]])[0]
        metas_list = (res.get("metadatas") or [[]])[0]
        for cid, ctext, cmeta in zip(ids_list, docs_list, metas_list):
            if cid not in seen_ids:
                seen_ids.add(cid)
                selected_chunks.append(
                    {
                        "filename": cmeta.get("filename", "เอกสาร"),
                        "page": int(cmeta.get("page", 1)),
                        "text": ctext,
                    }
                )

    global_res = _vector_collection.query(
        query_texts=[query_text],
        n_results=min(total_k, len(all_metadatas)),
        where={"collection_id": int(collection_id)},
    )
    g_ids = (global_res.get("ids") or [[]])[0]
    g_docs = (global_res.get("documents") or [[]])[0]
    g_metas = (global_res.get("metadatas") or [[]])[0]
    for cid, ctext, cmeta in zip(g_ids, g_docs, g_metas):
        if len(selected_chunks) >= total_k:
            break
        if cid not in seen_ids:
            seen_ids.add(cid)
            selected_chunks.append(
                {
                    "filename": cmeta.get("filename", "เอกสาร"),
                    "page": int(cmeta.get("page", 1)),
                    "text": ctext,
                }
            )

    return selected_chunks


async def stream_rag_answer(
    collection_id: int,
    user_message: str,
    chat_history: list[dict],
    model_name: str = "openai/gpt-4o-mini",
    doc_records: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    records = doc_records or []
    _ensure_all_docs_indexed(collection_id, records)

    chunks = _retrieve_cross_file_chunks(collection_id, user_message, total_k=12)

    citations_map: dict[tuple[str, int], dict] = {}
    context_blocks: list[str] = []

    for idx, ch in enumerate(chunks, start=1):
        fname = ch["filename"]
        page = ch["page"]
        excerpt = ch["text"][:140].strip()
        context_blocks.append(f"[แหล่งอ้างอิง {idx} | ไฟล์: {fname} | หน้า {page}]\n{ch['text']}")
        if (fname, page) not in citations_map:
            citations_map[(fname, page)] = {
                "fileName": fname,
                "page": page,
                "excerpt": excerpt,
            }

    yield {"type": "citations", "citations": list(citations_map.values())}

    if not settings.OPENROUTER_API_KEY:
        yield {"type": "error", "detail": "ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY ใน backend/.env"}
        return

    # สร้างสารบัญไฟล์ทั้งหมดในโปรเจคส่งให้ AI รู้จำนวนและชื่อไฟล์เสมอ
    if records:
        file_list_lines = "\n".join(
            f"{i}. {r['filename']}" for i, r in enumerate(records, start=1)
        )
        project_inventory = (
            f"รายการเอกสารทั้งหมดในโปรเจคนี้ (รวม {len(records)} ไฟล์):\n{file_list_lines}"
        )
    else:
        project_inventory = "รายการเอกสารทั้งหมดในโปรเจคนี้: 0 ไฟล์ (ยังไม่มีการอัปโหลดเอกสาร)"

    combined_context = (
        "\n\n---\n\n".join(context_blocks)
        if context_blocks
        else "ไม่พบย่อหน้าที่ตรงกับคำค้นหาโดยตรง"
    )

    system_prompt = (
        "คุณคือ Textspace AI ผู้ช่วยวิเคราะห์เอกสารอัจฉริยะ "
        "จงตอบคำถามโดยประมวลผลข้อมูลจาก 'ทุกไฟล์ในโปรเจคนี้รวมกัน' "
        "หากผู้ใช้ถามเกี่ยวกับจำนวนไฟล์ รายชื่อไฟล์ หรือบทที่มีในโปรเจค ให้ตอบจาก 'รายการเอกสารทั้งหมดในโปรเจคนี้' ด้านล่างได้ทันที "
        "และหากถามเนื้อหาเชิงลึก ให้สังเคราะห์ข้อมูลจากทุกไฟล์มาพิจารณาร่วมกัน พร้อมระบุชื่อไฟล์กับเลขหน้าอ้างอิงให้ชัดเจน\n\n"
        f"{project_inventory}\n\n"
        f"เนื้อหาที่ดึงมาจากเอกสารในโปรเจค:\n{combined_context}"
    )

    messages_payload = [{"role": "system", "content": system_prompt}]
    for h in chat_history[-8:]:
        messages_payload.append({"role": h["role"], "content": h["content"]})
    messages_payload.append({"role": "user", "content": user_message})

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model_name or "openai/gpt-4o-mini",
        "messages": messages_payload,
        "stream": True,
        "temperature": 0.2,
    }

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            async with client.stream("POST", OPENROUTER_URL, headers=headers, json=body) as response:
                if response.status_code != 200:
                    err_text = await response.aread()
                    yield {
                        "type": "error",
                        "detail": f"OpenRouter Error ({response.status_code}): {err_text.decode('utf-8', errors='ignore')}",
                    }
                    return

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk_json = json.loads(data_str)
                        delta = chunk_json["choices"][0].get("delta", {})
                        token = delta.get("content")
                        if token:
                            yield {"type": "token", "content": token}
                    except Exception:
                        continue
    except Exception as exc:
        yield {"type": "error", "detail": f"เชื่อมต่อ OpenRouter ไม่สำเร็จ: {str(exc)}"}