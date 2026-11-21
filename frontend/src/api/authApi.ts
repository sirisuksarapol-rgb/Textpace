const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail[0]?.msg
      : data.detail;
    throw new Error(detail || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
  return data as T;
}

export interface SignupPayload {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const authApi = {
  signup: (payload: SignupPayload) =>
    request<{ message: string }>('/api/auth/signup', payload),

  verifyOtp: (email: string, otp_code: string) =>
    request<{ message: string }>('/api/auth/verify-otp', { email, otp_code }),

  resendOtp: (email: string) =>
    request<{ message: string }>('/api/auth/resend-otp', { email }),

  login: (email: string, password: string, remember_me: boolean) =>
    request<AuthResponse>('/api/auth/login', { email, password, remember_me }),

  googleLogin: (credential: string) =>
    request<AuthResponse>('/api/auth/google', { credential }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>('/api/auth/reset-password', { token, new_password }),
};