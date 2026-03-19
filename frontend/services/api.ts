const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

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
    const body = await response.json().catch(() => ({}));
    const detail = body?.detail;
    let message: string;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail.map((e: any) => e?.msg ?? JSON.stringify(e)).join(", ");
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
