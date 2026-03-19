import { api } from "./api";

const TOKEN_KEY = "admin_token";

interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  pessoa_id: number;
  nome: string;
}

export const authService = {
  async login(cpf: string, senha: string): Promise<LoginResponse> {
    const data = await api.post<LoginResponse>("/auth/login", { cpf, senha });
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem("user_role", data.role);
      localStorage.setItem("user_pessoa_id", String(data.pessoa_id));
      localStorage.setItem("user_nome", data.nome);
    }
    return data;
  },
  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("user_role");
      localStorage.removeItem("user_pessoa_id");
      localStorage.removeItem("user_nome");
    }
  },
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  getRole(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("user_role");
  },
  getNome(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("user_nome");
  },
  isAuthenticated(): boolean { return !!this.getToken(); },
};
