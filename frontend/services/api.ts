const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers: optHeaders, ...restOptions } = options ?? {};
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...optHeaders },
    ...restOptions,
  });
  if (response.status === 401) {
    if (typeof window !== "undefined") { localStorage.removeItem("admin_token"); window.location.href = "/admin/login"; }
    throw new Error("Sessão expirada");
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `Erro ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};

export const apiAuth = {
  get: <T>(path: string) => request<T>(path, { method: "GET", headers: getAuthHeaders() }),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body), headers: getAuthHeaders() }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body), headers: getAuthHeaders() }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined, headers: getAuthHeaders() }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE", headers: getAuthHeaders() }),
  upload: <T>(path: string, formData: FormData) => {
    const headers = getAuthHeaders() as Record<string, string>;
    delete headers["Content-Type"];
    return request<T>(path, { method: "POST", body: formData, headers });
  },
};
