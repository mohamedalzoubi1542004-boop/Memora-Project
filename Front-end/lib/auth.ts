const TOKEN_KEY = "memora_token";
const USER_KEY  = "memora_user";

export interface AuthUser {
  user_id: number;
  full_name: string;
  role: string;
  access_token: string;
  is_approved?: boolean | null;
  is_verified?: boolean;
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAuth(data: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/* ─── API helpers ─── */
const BASE = "/api";

async function post<T>(path: string, body: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "خطأ في الطلب");
  }
  return res.json();
}

export async function apiRegister(data: {
  email: string; password: string; full_name: string; role?: string;
}): Promise<AuthUser> {
  const result = await post<AuthUser>("/auth/register", data);
  saveAuth(result);
  return result;
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  const result = await post<AuthUser>("/auth/login", { email, password });
  saveAuth(result);
  return result;
}
