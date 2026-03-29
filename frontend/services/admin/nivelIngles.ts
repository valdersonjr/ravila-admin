import { api } from "../api";

export const NIVEIS_CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export interface NivelInglesAluno {
  pessoa_id: number;
  nome: string;
  nivel_atual: string | null;
  avaliado_em: string | null;
  total_respondidas: number;
  acertos: number;
  percentual: number;
}

export interface NivelInglesListOut {
  items: NivelInglesAluno[];
  total: number;
  page: number;
  page_size: number;
}

export interface NivelInglesStats {
  total: number;
  sem_nivel: number;
  pronto_para_avancar: number;
  com_dificuldade: number;
}

export const nivelInglesService = {
  stats(): Promise<NivelInglesStats> {
    return api.get("/alunos/nivel-ingles/stats");
  },

  listar(params: { page?: number; page_size?: number; search?: string; nivel?: string } = {}): Promise<NivelInglesListOut> {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.page_size) qs.set("page_size", String(params.page_size));
    if (params.search) qs.set("search", params.search);
    if (params.nivel) qs.set("nivel", params.nivel);
    const q = qs.toString();
    return api.get(`/alunos/nivel-ingles${q ? `?${q}` : ""}`);
  },

  atualizar(pessoaId: number, nivel: string): Promise<void> {
    return api.patch(`/alunos/${pessoaId}/nivel-ingles`, { nivel });
  },

  liberarReavaliacao(pessoaId: number): Promise<void> {
    return api.post(`/alunos/${pessoaId}/nivel-ingles/liberar-reavaliacao`, {});
  },
};
