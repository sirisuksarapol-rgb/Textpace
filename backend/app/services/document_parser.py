import io
import pymupdf
from docx import Document as DocxDocument


def extract_text_from_file(filename: str, content_bytes: bytes) -> tuple[str, int, str]:
    ext = filename.rsplit(".", 1)[-1].upper() if "." in filename else "FILE"

    if ext == "PDF":
        pages_text: list[str] = []
        with pymupdf.open(stream=content_bytes, filetype="pdf") as pdf_doc:
            page_count = max(1, len(pdf_doc))
            for idx, page in enumerate(pdf_doc, start=1):
                text = page.get_text("text").strip()
                if text:
                    pages_text.append(f"[หน้า {idx}]\n{text}")
        full_text = "\n\n".join(pages_text) or "ไม่พบข้อความที่สามารถอ่านได้ในไฟล์ PDF นี้"
        return full_text, page_count, "PDF"

    if ext == "DOCX":
        doc = DocxDocument(io.BytesIO(content_bytes))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        full_text = "\n\n".join(paragraphs) or "ไม่พบข้อความในไฟล์ DOCX นี้"
        page_count = max(1, (len(full_text) // 2500) + 1)
        return full_text, page_count, "DOCX"

    for encoding in ("utf-8", "tis-620", "cp874", "latin-1"):
        try:
            full_text = content_bytes.decode(encoding).strip()
            page_count = max(1, (len(full_text) // 2500) + 1)
            return full_text, page_count, ext
        except UnicodeDecodeError:
            continue

    return "ไม่สามารถถอดรหัสข้อความจากไฟล์นี้ได้", 1, ext