export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  oauth_provider: string;
  is_verified: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  document_count: number;
}

export interface DocumentItem {
  id: number;
  collection_id: number;
  filename: string;
  file_type: string;
  summary_wiki: string | null;
  created_at: string;
}

export interface CitationItem {
  doc_id: number;
  filename: string;
  page: number;
  snippet: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationItem[] | null;
  created_at: string;
}