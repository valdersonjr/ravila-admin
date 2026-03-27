import { api, apiAuth, setAccessToken } from "./api";

const REFRESH_KEY = "refresh_token";
const ROLE_KEY = "user_role";
const NOME_KEY = "user_nome";
const PESSOA_ID_KEY = "user_pessoa_id";

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: string;
  pessoa_id: number | null;
  nome: string;
}

export const authService = {
  async login(username: string, senha: string): Promise<LoginResponse> {
    const data = await api.post<LoginResponse>("/auth/login", { username, senha });
    setAccessToken(data.access_token);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(REFRESH_KEY, data.refresh_token);
      sessionStorage.setItem(ROLE_KEY, data.role);
      sessionStorage.setItem(NOME_KEY, data.nome);
      sessionStorage.setItem(PESSOA_ID_KEY, data.pessoa_id != null ? String(data.pessoa_id) : "");
    }
    return data;
  },

  async tryRefresh(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;
    try {
      const data = await api.post<{ access_token: string; token_type: string }>(
        "/auth/refresh",
        { refresh_token: refreshToken }
      );
      setAccessToken(data.access_token);
      return true;
    } catch {
      this.logout();
      return false;
    }
  },

  logout(): void {
    setAccessToken(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(REFRESH_KEY);
      sessionStorage.removeItem(ROLE_KEY);
      sessionStorage.removeItem(NOME_KEY);
      sessionStorage.removeItem(PESSOA_ID_KEY);
    }
  },

  getRole(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(ROLE_KEY);
  },

  getNome(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(NOME_KEY);
  },

  getPessoaId(): number | null {
    if (typeof window === "undefined") return null;
    const v = sessionStorage.getItem(PESSOA_ID_KEY);
    return v ? Number(v) : null;
  },

  async me(): Promise<{ nome: string; email: string | null; telefone: string | null; tem_foto: boolean }> {
    return apiAuth.get("/auth/me");
  },

  async uploadFoto(file: File): Promise<void> {
    const form = new FormData();
    form.append("file", file);
    await apiAuth.upload<{ tem_foto: boolean }>("/auth/me/foto", form);
  },

  async fotoUrl(): Promise<string> {
    const res = await apiAuth.get<{ url: string }>("/auth/me/foto");
    return res.url;
  },

  async atualizarPerfil(dados: { nome?: string; email?: string; telefone?: string; senha?: string }): Promise<{ nome: string; email: string | null; telefone: string | null }> {
    const result = await apiAuth.patch<{ nome: string; email: string | null; telefone: string | null }>("/auth/me", dados);
    if (result.nome && typeof window !== "undefined") {
      sessionStorage.setItem(NOME_KEY, result.nome);
    }
    return result;
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!sessionStorage.getItem(REFRESH_KEY);
  },
};
