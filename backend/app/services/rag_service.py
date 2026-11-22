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
AGENT_FAST_MODEL = "openai/gpt-4o-mini"


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
        "model": AGENT_FAST_MODEL,
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


def _read_project_combined_wiki(collection_id: int) -> str:
    wiki_path = os.path.join(settings.UPLOAD_DIR, f"collection_{collection_id}_combined_wiki.md")
    if os.path.exists(wiki_path):
        try:
            with open(wiki_path, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception:
            return ""
    return ""


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


def _retrieve_cross_file_chunks(collection_id: int, query_text: str, total_k: int = 10) -> list[dict]:
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
                        "id": cid,
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
                    "id": cid,
                    "filename": cmeta.get("filename", "เอกสาร"),
                    "page": int(cmeta.get("page", 1)),
                    "text": ctext,
                }
            )

    return selected_chunks


def _extract_json_object(raw_text: str) -> dict:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        lines = [line for line in cleaned.splitlines() if not line.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]
    return json.loads(cleaned)


async def _call_agent_json_step(system_prompt: str, user_prompt: str) -> dict:
    if not settings.OPENROUTER_API_KEY:
        return {}
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": AGENT_FAST_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.0,
        "response_format": {"type": "json_object"},
    }
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            return _extract_json_object(content)
    except Exception:
        return {}


async def _plan_agent_retrieval(
    user_message: str,
    chat_history: list[dict],
    records: list[dict],
    has_wiki: bool,
) -> dict:
    """Agent ขั้นที่ 1: วิเคราะห์เจตนา เลือกเส้นทางค้นหา และแตกคำถามย่อย"""
    if not records:
        return {"strategy": "direct", "sub_queries": []}

    file_names = ", ".join(r["filename"] for r in records)
    recent_turns = "\n".join(
        f"{h['role']}: {h['content'][:200]}" for h in chat_history[-4:]
    )

    system_prompt = (
        "คุณคือ Query Planner ของระบบ Agentic RAG วิเคราะห์คำถามของผู้ใช้แล้วตอบเป็น JSON เท่านั้น\n"
        "โครงสร้าง JSON:\n"
        "{\n"
        '  "strategy": "wiki_and_vector" | "multi_query" | "direct",\n'
        '  "sub_queries": ["คำค้นหาที่ 1", "คำค้นหาที่ 2"]\n'
        "}\n"
        "เกณฑ์การตัดสินใจ:\n"
        '- เลือก "wiki_and_vector" เมื่อผู้ใช้ถามภาพรวมทั้งโปรเจค สรุปทุกไฟล์ เปรียบเทียบโครงสร้าง หรือถามภาพใหญ่\n'
        '- เลือก "multi_query" เมื่อถามรายละเอียดเฉพาะจุด ตัวเลข ขั้นตอน หรือเปรียบเทียบข้ามบท/ข้ามไฟล์ (แตกเป็น 1-3 คำค้นหาย่อยที่ชัดเจน แทนคำสรรพนามจากประวัติแชทให้ครบ)\n'
        '- เลือก "direct" เฉพาะคำทักทายทั่วไป หรือคำถามที่ถามแค่จำนวน/รายชื่อไฟล์ในโปรเจค\n'
        f"หมายเหตุ: has_wiki={has_wiki}"
    )
    user_prompt = (
        f"รายชื่อไฟล์ในโปรเจค ({len(records)} ไฟล์): {file_names}\n"
        f"บทสนทนาก่อนหน้า:\n{recent_turns or 'ไม่มี'}\n\n"
        f"คำถามล่าสุด: {user_message}"
    )

    plan = await _call_agent_json_step(system_prompt, user_prompt)
    strategy = plan.get("strategy")
    if strategy not in {"wiki_and_vector", "multi_query", "direct"}:
        strategy = "multi_query"

    raw_queries = plan.get("sub_queries")
    sub_queries = (
        [str(q).strip() for q in raw_queries if str(q).strip()][:3]
        if isinstance(raw_queries, list)
        else []
    )
    if strategy != "direct" and not sub_queries:
        sub_queries = [user_message]

    return {"strategy": strategy, "sub_queries": sub_queries}


async def _grade_and_rewrite_query(
    user_message: str,
    retrieved_chunks: list[dict],
    used_queries: list[str],
) -> tuple[bool, str]:
    """Agent ขั้นที่ 3: ประเมินว่าข้อมูลที่ค้นมามีคำตอบพอไหม ถ้าไม่พอให้คิดคำค้นใหม่"""
    if not retrieved_chunks:
        return False, ""

    preview = "\n".join(
        f"- [{c['filename']} หน้า {c['page']}]: {c['text'][:220]}"
        for c in retrieved_chunks[:8]
    )
    system_prompt = (
        "คุณคือ Retrieval Grader ของระบบ Agentic RAG ตรวจว่าท่อนเอกสารที่ค้นมาเพียงพอต่อการตอบคำถามหรือไม่\n"
        "ตอบเป็น JSON เท่านั้น:\n"
        '{"sufficient": true/false, "rewritten_query": "คำค้นหาใหม่ที่เจาะจงขึ้นหาก sufficient เป็น false"}'
    )
    user_prompt = (
        f"คำถามผู้ใช้: {user_message}\n"
        f"คำค้นหาที่ใช้ไปแล้ว: {used_queries}\n\n"
        f"ท่อนเอกสารที่ค้นพบ:\n{preview}"
    )

    grade = await _call_agent_json_step(system_prompt, user_prompt)
    if not grade:
        return True, ""

    sufficient = bool(grade.get("sufficient", True))
    rewritten = str(grade.get("rewritten_query") or "").strip()
    if rewritten in used_queries:
        rewritten = ""
    return sufficient, rewritten


def _merge_unique_chunks(existing: list[dict], incoming: list[dict], max_items: int = 14) -> list[dict]:
    seen = {
        c.get("id") or f"{c['filename']}_{c['page']}_{c['text'][:60]}"
        for c in existing
    }
    merged = list(existing)
    for item in incoming:
        key = item.get("id") or f"{item['filename']}_{item['page']}_{item['text'][:60]}"
        if key not in seen:
            seen.add(key)
            merged.append(item)
        if len(merged) >= max_items:
            break
    return merged


async def stream_rag_answer(
    collection_id: int,
    user_message: str,
    chat_history: list[dict],
    model_name: str = "openai/gpt-4o-mini",
    doc_records: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    records = doc_records or []
    _ensure_all_docs_indexed(collection_id, records)
    combined_wiki = _read_project_combined_wiki(collection_id)

    # ขั้นที่ 1: Agent วิเคราะห์คำถามและวางแผน
    yield {"type": "status", "content": "กำลังวิเคราะห์คำถามและวางแผนการค้นหา..."}
    plan = await _plan_agent_retrieval(
        user_message=user_message,
        chat_history=chat_history,
        records=records,
        has_wiki=bool(combined_wiki),
    )
    strategy: str = plan["strategy"]
    sub_queries: list[str] = plan["sub_queries"]

    chunks: list[dict] = []

    # ขั้นที่ 2: ค้นหาตามแผน (Multi-Query Retrieval)
    if strategy != "direct" and records:
        yield {
            "type": "status",
            "content": f"กำลังค้นหาข้อมูล ({len(sub_queries)} ประเด็น) จาก {len(records)} ไฟล์...",
        }
        per_query_k = max(6, 12 // max(1, len(sub_queries)))
        for sq in sub_queries:
            found = _retrieve_cross_file_chunks(collection_id, sq, total_k=per_query_k)
            chunks = _merge_unique_chunks(chunks, found, max_items=14)

        # ขั้นที่ 3: Agent ตรวจสอบคุณภาพข้อมูล และค้นซ้ำด้วยคำค้นใหม่หากข้อมูลยังไม่พอ
        yield {"type": "status", "content": "กำลังตรวจสอบความครบถ้วนของหลักฐาน..."}
        sufficient, rewritten_query = await _grade_and_rewrite_query(
            user_message=user_message,
            retrieved_chunks=chunks,
            used_queries=sub_queries,
        )
        if not sufficient and rewritten_query:
            yield {
                "type": "status",
                "content": f"ข้อมูลยังไม่ครบ กำลังค้นเพิ่มเติม: \"{rewritten_query}\"...",
            }
            extra_chunks = _retrieve_cross_file_chunks(collection_id, rewritten_query, total_k=8)
            chunks = _merge_unique_chunks(chunks, extra_chunks, max_items=16)

    # ขั้นที่ 4: จัดเตรียม Citations และ Context สำหรับตอบ
    yield {"type": "status", "content": "กำลังเรียบเรียงคำตอบพร้อมแหล่งอ้างอิง..."}

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

    if records:
        file_list_lines = "\n".join(
            f"{i}. {r['filename']}" for i, r in enumerate(records, start=1)
        )
        project_inventory = (
            f"รายการเอกสารทั้งหมดในโปรเจคนี้ (รวม {len(records)} ไฟล์):\n{file_list_lines}"
        )
    else:
        project_inventory = "รายการเอกสารทั้งหมดในโปรเจคนี้: 0 ไฟล์ (ยังไม่มีการอัปโหลดเอกสาร)"

    wiki_section = ""
    if strategy == "wiki_and_vector" and combined_wiki:
        wiki_section = (
            "สรุปภาพรวมทั้งโปรเจคที่สังเคราะห์ไว้ (LLM Wiki):\n"
            f"{combined_wiki[:7000]}\n\n---\n\n"
        )

    combined_context = (
        "\n\n---\n\n".join(context_blocks)
        if context_blocks
        else "ไม่พบย่อหน้าที่ตรงกับคำค้นหาโดยตรง"
    )

    system_prompt = (
        "คุณคือ Textspace AI ผู้ช่วยวิเคราะห์เอกสารอัจฉริยะ (โหมด Agentic RAG) "
        "จงตอบคำถามโดยประมวลผลข้อมูลจาก 'ทุกไฟล์ในโปรเจคนี้รวมกัน' "
        "หากผู้ใช้ถามเกี่ยวกับจำนวนไฟล์ รายชื่อไฟล์ หรือบทที่มีในโปรเจค ให้ตอบจาก 'รายการเอกสารทั้งหมดในโปรเจคนี้' ด้านล่างได้ทันที "
        "และหากถามเนื้อหาเชิงลึก ให้สังเคราะห์ข้อมูลจากทุกไฟล์มาพิจารณาร่วมกัน พร้อมระบุชื่อไฟล์กับเลขหน้าอ้างอิงให้ชัดเจน\n\n"
        f"{project_inventory}\n\n"
        f"{wiki_section}"
        f"เนื้อหาละเอียดที่ดึงมาจากเอกสารในโปรเจค:\n{combined_context}"
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
        "model": model_name or AGENT_FAST_MODEL,
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