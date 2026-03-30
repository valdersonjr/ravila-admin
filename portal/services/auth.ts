const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ACCESS_KEY    = "portal_access_token";
const REFRESH_KEY   = "portal_refresh_token";
const ROLE_KEY      = "portal_role";
const NOME_KEY      = "portal_nome";
const PESSOA_ID_KEY = "portal_pessoa_id";

function isClient(): boolean {
  return typeof window !== "undefined";
}

function getStorageItem(key: string): string | null {
  return isClient() ? sessionStorage.getItem(key) : null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStorageItem(ACCESS_KEY);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers, ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  role: string;
  pessoa_id: number | null;
  nome: string;
}

function persistAuthSession(data: LoginResponse): void {
  sessionStorage.setItem(ACCESS_KEY, data.access_token);
  sessionStorage.setItem(REFRESH_KEY, data.refresh_token);
  sessionStorage.setItem(ROLE_KEY, data.role);
  sessionStorage.setItem(NOME_KEY, data.nome);
  sessionStorage.setItem(PESSOA_ID_KEY, data.pessoa_id != null ? String(data.pessoa_id) : "");
}

export const authService = {
  async login(username: string, senha: string): Promise<LoginResponse> {
    const data = await request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, senha }),
    });

    if (data.role !== "aluno") {
      throw new Error("Acesso restrito ao portal do aluno.");
    }

    persistAuthSession(data);
    return data;
  },

  logout(): void {
    [ACCESS_KEY, REFRESH_KEY, ROLE_KEY, NOME_KEY, PESSOA_ID_KEY].forEach((key) =>
      sessionStorage.removeItem(key)
    );
  },

  getToken(): string | null {
    return getStorageItem(ACCESS_KEY);
  },

  getNome(): string | null {
    return getStorageItem(NOME_KEY);
  },

  getPessoaId(): number | null {
    const value = getStorageItem(PESSOA_ID_KEY);
    return value ? Number(value) : null;
  },

  isAuthenticated(): boolean {
    return !!getStorageItem(ACCESS_KEY);
  },

  me(): Promise<{ nome: string; email: string | null; telefone: string | null; tem_foto: boolean }> {
    return request("/auth/me");
  },

  async uploadFoto(file: File): Promise<void> {
    const token = getStorageItem(ACCESS_KEY);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE_URL}/auth/me/foto`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? `Erro ${res.status}`);
    }
  },

  getFotoUrl(): Promise<{ url: string }> {
    return request("/auth/me/foto");
  },

  async atualizarPerfil(dados: {
    nome?: string;
    email?: string;
    telefone?: string;
    senha?: string;
    senha_antiga?: string;
  }): Promise<{ nome: string; email: string | null; telefone: string | null }> {
    const result = await request<{ nome: string; email: string | null; telefone: string | null }>(
      "/auth/me",
      { method: "PATCH", body: JSON.stringify(dados) }
    );
    if (result.nome && isClient()) {
      sessionStorage.setItem(NOME_KEY, result.nome);
    }
    return result;
  },
};
