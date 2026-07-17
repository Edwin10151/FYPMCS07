const API_BASE = "/api";

export type Session = {
  access_token: string;
  token_type: string;
  user: {
    user_id: number;
    full_name: string;
    email: string;
    role_name: string;
    permission_level: number;
  };
};

export async function apiFetch<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Request failed");
  }
  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return apiFetch<Session>("/auth/login", undefined, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

