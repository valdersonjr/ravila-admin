import { apiAuth } from "../api";

export const NIVEIS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const SUBTIPOS = ["multiple_choice", "fill_blanks", "dissertativa", "redacao"] as const;
export const CONTEXTOS = ["casual", "vestibular", "toefl_ielts", "avaliacao"] as const;
export const TOPICOS = ["grammar", "vocabulary", "reading", "listening", "writing", "speaking", "pronunciation"] as const;
export const DIFICULDADES = ["easy", "medium", "hard"] as const;

export const CONTEXTO_LABELS: Record<string, string> = {
  casual: "Casual",
  vestibular: "Vestibular",
  toefl_ielts: "TOEFL / IELTS",
  avaliacao: "Avaliação",
};

export const SUBTIPO_LABELS: Record<string, string> = {
  multiple_choice: "Múltipla escolha",
  fill_blanks: "Preencher lacuna",
  dissertativa: "Dissertativa",
  redacao: "Redação",
};

export const TOPICO_LABELS: Record<string, string> = {
  grammar: "Gramática",
  vocabulary: "Vocabulário",
  reading: "Leitura",
  listening: "Audição",
  writing: "Escrita",
  speaking: "Fala",
  pronunciation: "Pronúncia",
};

export const DIFICULDADE_LABELS: Record<string, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
};

export interface Questao {
  id: number;
  codigo: string;
  enunciado: string;
  nivel: string;
  subtipo: string;
  contexto: string;
  topico: string;
  dificuldade: string;
  texto_apoio: string | null;
  midia_url: string | null;
  midia_tipo: string | null;
  alternativas: string[] | null;
  resposta_correta: string;
  explicacao: string | null;
  criado_por_id: number | null;
  ativo: boolean;
  criado_em: string;
}

export interface QuestaoCreate {
  enunciado: string;
  nivel: string;
  subtipo: string;
  contexto: string;
  topico: string;
  dificuldade: string;
  texto_apoio?: string;
  midia_url?: string;
  midia_tipo?: string;
  alternativas?: string[];
  resposta_correta: string;
  explicacao?: string;
}

export const questoesService = {
  listar: (params?: {
    nivel?: string;
    subtipo?: string;
    contexto?: string;
    topico?: string;
    dificuldade?: string;
    ativo?: boolean;
    busca?: string;
    page?: number;
    page_size?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.nivel) qs.set("nivel", params.nivel);
    if (params?.subtipo) qs.set("subtipo", params.subtipo);
    if (params?.contexto) qs.set("contexto", params.contexto);
    if (params?.topico) qs.set("topico", params.topico);
    if (params?.dificuldade) qs.set("dificuldade", params.dificuldade);
    if (params?.ativo !== undefined) qs.set("ativo", String(params.ativo));
    if (params?.busca) qs.set("busca", params.busca);
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
