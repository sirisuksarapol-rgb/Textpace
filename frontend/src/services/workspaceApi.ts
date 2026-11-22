export interface CollectionSummary {
  id: string;
  name: string;
  description: string;
  docCount: number;
  messageCount: number;
  updatedAt: string;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  size: number;
  typeLabel: string;
  status: 'ready' | 'processing';
  summaryWiki?: string;
  createdAt?: string;
}

export interface CitationItem {
  fileName: string;
  page: number;
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  citations?: CitationItem[];
  timestamp: string;
}

export interface CollectionDetail {
  id: string;
  name: string;
  description: string;
  combinedWiki: string;
  documents: WorkspaceFile[];
  messages: ChatMessage[];
}

interface RawCollection {
  id: number | string;
  name: string;
  description?: string | null;
  document_count?: number;
  message_count?: number;
  updated_at?: string;
  created_at?: string;
}

interface RawDocument {
  id: number | string;
  filename: string;
  file_type?: string;
  file_size?: number;
  summary_wiki?: string | null;
  created_at?: string;
}

interface RawMessage {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Record<string, unknown>[] | null;
  created_at?: string;
}

interface RawWikiResponse {
  summary_wiki?: string;
  file_count?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const COLLECTIONS_BASE = `${API_BASE_URL}/api/v1/collections`;

function isJwtString(value: string): boolean {
  const cleaned = value.replace(/^"|"$/g, '').trim();
  return cleaned.startsWith('eyJ') && cleaned.split('.').length === 3;
}

function findJwtInValue(value: unknown, depth = 0): string {
  if (depth > 4 || value == null) return '';

  if (typeof value === 'string') {
    const cleaned = value.replace(/^"|"$/g, '').trim();
    if (isJwtString(cleaned)) return cleaned;
    if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
      try {
        return findJwtInValue(JSON.parse(cleaned), depth + 1);
      } catch {
        return '';
      }
    }
    return '';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJwtInValue(item, depth + 1);
      if (found) return found;
    }
    return '';
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const priorityKeys = ['access_token', 'accessToken', 'token', 'auth_token', 'jwt'];
    for (const key of priorityKeys) {
      if (key in record) {
        const found = findJwtInValue(record[key], depth + 1);
        if (found) return found;
      }
    }
    for (const val of Object.values(record)) {
      const found = findJwtInValue(val, depth + 1);
      if (found) return found;
    }
  }

  return '';
}

function extractJwtFromStorage(storage: Storage): string {
  const directKeys = ['access_token', 'accessToken', 'token', 'auth_token', 'jwt'];
  for (const key of directKeys) {
    const raw = storage.getItem(key);
    if (raw) {
      const found = findJwtInValue(raw);
      if (found) return found;
    }
  }

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    const raw = storage.getItem(key);
    if (!raw) continue;
    const found = findJwtInValue(raw);
    if (found) return found;
  }

  return '';
}

function getStoredToken(): string {
  return extractJwtFromStorage(sessionStorage) || extractJwtFromStorage(localStorage);
}

function getAuthHeaders(isJson = true): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseErrorMessage(res: Response): Promise<string> {
  const errData = (await res.json().catch(() => ({}))) as { detail?: unknown };
  if (typeof errData.detail === 'string') {
    return errData.detail;
  }
  if (Array.isArray(errData.detail) && errData.detail.length > 0) {
    const first = errData.detail[0] as { msg?: string };
    if (first?.msg) return first.msg;
  }
  return `Request failed (${res.status})`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

function formatDateLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function mapDocument(raw: RawDocument): WorkspaceFile {
  const ext = (raw.file_type || raw.filename.split('.').pop() || 'FILE').toUpperCase();
  return {
    id: String(raw.id),
    name: raw.filename,
    size: raw.file_size ?? 0,
    typeLabel: ext,
    status: 'ready',
    summaryWiki: raw.summary_wiki || '',
    createdAt: formatDateLabel(raw.created_at),
  };
}

function normalizeCitations(rawList?: Record<string, unknown>[] | null): CitationItem[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((c) => ({
    fileName: String(c.fileName || c.filename || c.source || 'เอกสารอ้างอิง'),
    page: Number(c.page || c.page_number || 1),
    excerpt: String(c.excerpt || c.snippet || c.text || c.content || ''),
  }));
}

function mapMessage(raw: RawMessage): ChatMessage {
  return {
    id: String(raw.id),
    role: raw.role,
    content: raw.content,
    citations: normalizeCitations(raw.citations),
    timestamp: formatTimeLabel(raw.created_at),
  };
}

export const workspaceApi = {
  async listCollections(): Promise<CollectionSummary[]> {
    const res = await fetch(COLLECTIONS_BASE, {
      headers: getAuthHeaders(),
    });
    const list = await handleResponse<RawCollection[]>(res);
    return list.map((c) => ({
      id: String(c.id),
      name: c.name,
      description: c.description || '',
      docCount: c.document_count ?? 0,
      messageCount: c.message_count ?? 0,
      updatedAt: formatDateLabel(c.updated_at || c.created_at),
    }));
  },

  async createCollection(
    name: string,
    description: string,
    files: File[]
  ): Promise<CollectionDetail> {
    const createRes = await fetch(COLLECTIONS_BASE, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
      }),
    });
    const created = await handleResponse<RawCollection>(createRes);
    const collectionId = String(created.id);

    const uploadedDocs = files.length > 0 ? await this.uploadDocuments(collectionId, files) : [];
    const combinedWiki = uploadedDocs[0]?.summaryWiki || '';

    return {
      id: collectionId,
      name: created.name,
      description: created.description || '',
      combinedWiki,
      documents: uploadedDocs,
      messages: [],
    };
  },

  async updateCollection(
    collectionId: string,
    name: string,
    description?: string
  ): Promise<CollectionSummary> {
    const payload: { name: string; description?: string } = { name: name.trim() };
    if (description !== undefined) {
      payload.description = description;
    }

    const res = await fetch(`${COLLECTIONS_BASE}/${collectionId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    const updated = await handleResponse<RawCollection>(res);
    return {
      id: String(updated.id),
      name: updated.name,
      description: updated.description || '',
      docCount: updated.document_count ?? 0,
      messageCount: updated.message_count ?? 0,
      updatedAt: formatDateLabel(updated.updated_at || updated.created_at),
    };
  },

  async uploadDocuments(collectionId: string, files: File[]): Promise<WorkspaceFile[]> {
    if (files.length === 0) return [];
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const res = await fetch(`${COLLECTIONS_BASE}/${collectionId}/documents`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: formData,
    });
    const rawDocs = await handleResponse<RawDocument[]>(res);
    return rawDocs.map(mapDocument);
  },

  async getCombinedWiki(collectionId: string): Promise<string> {
    const res = await fetch(`${COLLECTIONS_BASE}/${collectionId}/wiki`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<RawWikiResponse>(res);
    return data.summary_wiki || '';
  },

  async getCollectionDetail(collectionId: string): Promise<CollectionDetail> {
    const [cols, docsRes, msgsRes, wikiRes] = await Promise.all([
      this.listCollections(),
      fetch(`${COLLECTIONS_BASE}/${collectionId}/documents`, {
        headers: getAuthHeaders(),
      }),
      fetch(`${COLLECTIONS_BASE}/${collectionId}/messages`, {
        headers: getAuthHeaders(),
      }),
      fetch(`${COLLECTIONS_BASE}/${collectionId}/wiki`, {
        headers: getAuthHeaders(),
      }),
    ]);

    const rawDocs = await handleResponse<RawDocument[]>(docsRes);
    const rawMsgs = msgsRes.ok
      ? ((await msgsRes.json().catch(() => [])) as RawMessage[])
      : [];
    const wikiData = wikiRes.ok
      ? ((await wikiRes.json().catch(() => ({}))) as RawWikiResponse)
      : {};
    const currentCol = cols.find((c) => c.id === String(collectionId));
    const mappedDocs = rawDocs.map(mapDocument);

    return {
      id: String(collectionId),
      name: currentCol?.name || `คอลเลกชัน #${collectionId}`,
      description: currentCol?.description || '',
      combinedWiki: wikiData.summary_wiki || mappedDocs[0]?.summaryWiki || '',
      documents: mappedDocs,
      messages: rawMsgs.map(mapMessage),
    };
  },

  async fetchDocumentFile(collectionId: string, docId: string): Promise<Blob> {
    const res = await fetch(`${COLLECTIONS_BASE}/${collectionId}/documents/${docId}/file`, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) {
      const message = await parseErrorMessage(res);
      throw new Error(message);
    }
    return res.blob();
  },

  async deleteDocument(collectionId: string, docId: string): Promise<void> {
    const res = await fetch(`${COLLECTIONS_BASE}/${collectionId}/documents/${docId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<void>(res);
  },

  async streamChatMessage(
    collectionId: string,
    message: string,
    model: string,
    handlers: {
      onCitations?: (citations: CitationItem[]) => void;
      onToken: (token: string) => void;
    }
  ): Promise<void> {
    const res = await fetch(`${COLLECTIONS_BASE}/${collectionId}/chat`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ message, model }),
    });

    if (!res.ok || !res.body) {
      const messageText = await parseErrorMessage(res);
      throw new Error(messageText);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const rawEvent of events) {
        const line = rawEvent.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;

        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr) as {
            type?: string;
            content?: string;
            citations?: Record<string, unknown>[];
            detail?: string;
          };

          if (parsed.type === 'citations' && parsed.citations) {
            handlers.onCitations?.(normalizeCitations(parsed.citations));
          } else if (parsed.type === 'token' && typeof parsed.content === 'string') {
            handlers.onToken(parsed.content);
          } else if (parsed.type === 'error') {
            throw new Error(parsed.detail || 'เกิดข้อผิดพลาดระหว่างสร้างคำตอบ');
          }
        } catch (err) {
          if (err instanceof Error && err.message !== 'Unexpected end of JSON input') {
            throw err;
          }
        }
      }
    }
  },

  async resetChatHistory(collectionId: string): Promise<void> {
    const res = await fetch(`${COLLECTIONS_BASE}/${collectionId}/messages`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<void>(res);
  },
};