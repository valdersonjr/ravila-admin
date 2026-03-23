const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

// Access token stored in memory only — not persisted to localStorage/sessionStorage.
// Surviving page reload relies on the refresh flow in layout.tsx.
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

// Single in-flight refresh promise so concurrent 401s don't trigger multiple refresh calls.
let _refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = sessionStorage.getItem("refresh_token");
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      sessionStorage.removeItem("refresh_token");
      return false;
    }
    const data = await res.json() as { access_token: string };
    _accessToken = data.access_token;
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options?: RequestInit, isRetry = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (!(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;

  const { headers: optHeaders, ...restOptions } = options ?? {};
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { ...headers, ...(optHeaders as Record<string, string> ?? {}) },
    ...restOptions,
  });

  if (response.status === 401 && !isRetry) {
    if (!_refreshPromise) {
      _refreshPromise = attemptRefresh().finally(() => { _refreshPromise = null; });
    }
    const refreshed = await _refreshPromise;
    if (refreshed) return request<T>(path, options, true);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("refresh_token");
      window.location.href = "/admin/login";
    }
    throw new Error("Sessão expirada");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: unknown };
    const detail = body?.detail;
    let message: string;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail
        .map((e) => (e && typeof e === "object" && "msg" in e ? String(e.msg) : JSON.stringify(e)))
        .join(", ");
    } else {
      message = `Erro ${response.status}`;
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", body: formData }),
};

// Kept for compatibility — all requests now automatically include the token.
export const apiAuth = api;
