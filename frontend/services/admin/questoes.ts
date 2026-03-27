import { apiAuth } from "../api";

export const NIVEIS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const SUBTIPOS = ["multiple_choice", "fill_blanks"] as const;
export const ESTILOS = ["casual", "vestibular", "toefl_ielts"] as const;

export const ESTILO_LABELS: Record<string, string> = {
  casual: "Casual",
  vestibular: "Vestibular",
  toefl_ielts: "TOEFL / IELTS",
};

export const SUBTIPO_LABELS: Record<string, string> = {
  multiple_choice: "Múltipla escolha",
  fill_blanks: "Preencher lacuna",
};

export interface Questao {
  id: number;
  enunciado: string;
  nivel: string;
  subtipo: string;
  estilo: string;
  texto_apoio: string | null;
  midia_url: string | null;
  alternativas: string[] | null;
  resposta_correta: string;
  explicacao: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface QuestaoCreate {
  enunciado: string;
  nivel: string;
  subtipo: string;
  estilo: string;
  texto_apoio?: string;
  midia_url?: string;
  alternativas?: string[];
  resposta_correta: string;
  explicacao?: string;
}

export const questoesService = {
  listar: (params?: {
    nivel?: string;
    subtipo?: string;
    estilo?: string;
    ativo?: boolean;
    page?: number;
    page_size?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.nivel) qs.set("nivel", params.nivel);
    if (params?.subtipo) qs.set("subtipo", params.subtipo);
    if (params?.estilo) qs.set("estilo", params.estilo);
    if (params?.ativo !== undefined) qs.set("ativo", String(params.ativo));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    return apiAuth.get<{ items: Questao[]; total: number; page: number; page_size: number }>(
      `/questoes/${qs.toString() ? `?${qs}` : ""}`
    );
  },
  criar: (data: QuestaoCreate) => apiAuth.post<Questao>("/questoes/", data),
  atualizar: (id: number, data: Partial<QuestaoCreate & { ativo: boolean }>) =>
    apiAuth.patch<Questao>(`/questoes/${id}`, data),
  deletar: (id: number) => apiAuth.delete<void>(`/questoes/${id}`),
};
