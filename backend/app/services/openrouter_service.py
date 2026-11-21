import os
import json
import httpx
from app.models.workspace import (
    WorkspaceDocument as Document,
    WorkspaceChatMessage as ChatMessage,
)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
APP_URL = os.getenv("APP_URL", "http://localhost:5173")
APP_NAME = os.getenv("APP_NAME", "Textspace")

MAX_CONTEXT_CHARS = 36000


def build_document_context(documents: list[Document]) -> str:
    if not documents:
        return "ยังไม่มีเอกสารแนบในคอลเลกชันนี้"

    blocks: list[str] = []
    current_length = 0

    for doc in documents:
        header = f"=== ไฟล์: {doc.filename} (ทั้งหมด {doc.page_count} หน้า) ===\n"
        body = doc.extracted_text or ""
        chunk = header + body + "\n\n"

        if current_length + len(chunk) > MAX_CONTEXT_CHARS:
            remaining = max(0, MAX_CONTEXT_CHARS - current_length)
            if remaining > 200:
                blocks.append(chunk[:remaining] + "\n...[ตัดทอนเนื้อหาบางส่วนเนื่องจากยาวเกินขีดจำกัด]...")
            break

        blocks.append(chunk)
        current_length += len(chunk)

    return "".join(blocks)


async def ask_openrouter_with_docs(
    question: str,
    model: str,
    documents: list[Document],
    history: list[ChatMessage],
) -> tuple[str, list[dict]]:
    if not OPENROUTER_API_KEY:
        raise RuntimeError("ไม่พบ OPENROUTER_API_KEY ในไฟล์ .env")

    context_text = build_document_context(documents)

    system_prompt = (
        "คุณคือผู้ช่วย AI ของระบบ Textspace ที่ตอบคำถามโดยอ้างอิงจากเอกสารที่ผู้ใช้แนบไว้เท่านั้น\n"
        "กฎการตอบ:\n"
        "1. ตอบคำถามให้กระชับ ชัดเจน และตรงประเด็นตามภาษาที่ผู้ใช้ถาม\n"
        "2. อ้างอิงข้อมูลจากเอกสารด้านล่างเท่านั้น ห้ามแต่งข้อมูลนอกเหนือจากเอกสาร หากไม่พบให้แจ้งตรง ๆ\n"
        "3. ตอบกลับในรูปแบบ JSON เท่านั้น ตามโครงสร้างนี้:\n"
        '{"answer": "คำตอบของคุณ", "citations": [{"fileName": "ชื่อไฟล์", "page": 1, "excerpt": "ข้อความสั้นๆ ที่ใช้อ้างอิงจากเอกสาร"}]}'
    )

    api_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": f"เนื้อหาเอกสารอ้างอิง:\n\n{context_text}"},
    ]

    # แนบประวัติแชทล่าสุด 6 ข้อความเพื่อให้คุยต่อเนื่องได้
    for msg in history[-6:]:
        api_messages.append({"role": msg.role, "content": msg.content})

    api_messages.append({"role": "user", "content": question})

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": APP_URL,
        "X-Title": APP_NAME,
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": api_messages,
        "temperature": 0.2,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    raw_reply: str = data["choices"][0]["message"]["content"].strip()

    # แปลง JSON จากโมเดล (รองรับกรณีโมเดลหุ้มด้วย ```json ... ```)
    cleaned = raw_reply
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()

    try:
        parsed = json.loads(cleaned)
        answer = str(parsed.get("answer", raw_reply))
        citations = parsed.get("citations", [])
        if not isinstance(citations, list):
            citations = []
        return answer, citations
    except json.JSONDecodeError:
        return raw_reply, []