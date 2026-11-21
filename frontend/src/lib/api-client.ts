const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export function getToken(): string | null {
  return localStorage.getItem('access_token');
}

export function setToken(token: string): void {
  localStorage.setItem('access_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('access_token');
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // ตั้งค่า JSON header อัตโนมัติ ยกเว้นกรณีส่ง FormData (อัปโหลดไฟล์)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `เกิดข้อผิดพลาด (${response.status})`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export async function fetchDocumentBlobUrl(
  collectionId: number,
  docId: number
): Promise<string> {
  const token = getToken();
  const response = await fetch(
    `${API_BASE_URL}/collections/${collectionId}/documents/${docId}/file`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (!response.ok) {
    throw new Error('ไม่สามารถโหลดไฟล์เอกสารได้');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function streamCollectionChat(
  collectionId: number,
  message: string,
  onEvent: (event: { type: string; content?: string; citations?: any[] }) => void
): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok || !response.body) {
    throw new Error('ไม่สามารถเชื่อมต่อระบบแชท AI ได้');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          onEvent(parsed);
        } catch {
          // ข้าม chunk ที่ยังไม่สมบูรณ์
        }
      }
    }
  }
}