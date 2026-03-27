import { authService } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = authService.getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers, ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Erro ${res.status}`);
  }
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AulaPortal {
  id: number;
  data: string;           // "YYYY-MM-DD"
  hora_inicio: string;    // "HH:MM"
  hora_fim: string;       // "HH:MM"
  turma_nome: string | null;
  professor_nome: string;
  status: string;
  tipo: string;
}

export interface PresencaPortal {
  id: number;
  aula_id: number;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  turma_nome: string | null;
  presente: boolean;
}

export interface AulaListPortal {
  items: AulaPortal[];
  total: number;
  page: number;
  page_size: number;
}

export interface ResumoPortal {
  proxima_aula: AulaPortal | null;
  streak_dias: number;
  questao_respondida_hoje: boolean;
  nivel_atual: string | null;
}

export interface MaterialPortal {
  id: number;
  titulo: string;
  descricao: string | null;
  tipo: string;       // "pdf" | "link" | "video" | "imagem"
  categoria: string;
  aula_id: number | null;
  tem_arquivo: boolean;
}

export interface QuestaoPortal {
  id: number;
  enunciado: string;
  nivel: string;
  subtipo: string;
  estilo: string;
  texto_apoio: string | null;
  midia_url: string | null;
  alternativas: string[] | null;
}

export interface QuestaoAlunoDia {
  data: string;
  respondida: boolean;
  questao: QuestaoPortal;
}

export interface QuestaoRespostaPortal {
  acertou: boolean;
  resposta_correta: string;
  explicacao: string | null;
  streak: number;
}

export interface StatusTeste {
  concluido: boolean;
  nivel: string | null;
  avaliado_em: string | null;
}


export interface NivelProgresso {
  nivel_atual: string | null;
  total_respondidas: number;
  acertos: number;
  percentual: number;
  elegivel_upgrade: boolean;
  proximo_nivel: string | null;
}

export interface ContratoPortal {
  id: number;
  status: string;
  tipo: string;
  curso: string;
  valor_mensalidade: number;
  desconto_percentual: number | null;
  desconto_valor: number | null;
  dia_vencimento: number;
  data_inicio: string;
  data_fim: string;
  tem_assinado: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const portalService = {
  resumo(): Promise<ResumoPortal> {
    return request("/portal/resumo");
  },

  aulas(params?: {
    data_inicio?: string;
    data_fim?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<AulaListPortal> {
    const qs = new URLSearchParams();
    if (params?.data_inicio) qs.set("data_inicio", params.data_inicio);
    if (params?.data_fim) qs.set("data_fim", params.data_fim);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const q = qs.toString();
    return request(`/portal/aulas${q ? `?${q}` : ""}`);
  },

  presencas(params?: { page?: number; page_size?: number }): Promise<PresencaPortal[]> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const q = qs.toString();
    return request(`/portal/presencas${q ? `?${q}` : ""}`);
  },

  contratos(): Promise<ContratoPortal[]> {
    return request("/portal/contratos");
  },

  downloadContrato(id: number): Promise<{ url: string }> {
    return request(`/portal/contratos/${id}/download`);
  },

  materiaisAula(aulaId: number): Promise<MaterialPortal[]> {
    return request(`/portal/aulas/${aulaId}/materiais`);
  },

  biblioteca(params?: { categoria?: string }): Promise<MaterialPortal[]> {
    const qs = new URLSearchParams();
    if (params?.categoria) qs.set("categoria", params.categoria);
    const q = qs.toString();
    return request(`/portal/biblioteca${q ? `?${q}` : ""}`);
  },

  downloadMaterial(id: number): Promise<{ url: string }> {
    return request(`/portal/materiais/${id}/download`);
  },

  questaoDiaria(): Promise<QuestaoAlunoDia> {
    return request("/portal/questao-diaria");
  },

  responderDiaria(resposta_dada: string): Promise<QuestaoRespostaPortal> {
    return request("/portal/questao-diaria/responder", {
      method: "POST",
      body: JSON.stringify({ resposta_dada }),
    });
  },

  bancoquestoes(params?: { nivel?: string; estilo?: string; page?: number }): Promise<QuestaoPortal[]> {
    const qs = new URLSearchParams();
    if (params?.nivel) qs.set("nivel", params.nivel);
    if (params?.estilo) qs.set("estilo", params.estilo);
    if (params?.page) qs.set("page", String(params.page));
    const q = qs.toString();
    return request(`/portal/questoes${q ? `?${q}` : ""}`);
  },

  responderBanco(questaoId: number, resposta_dada: string): Promise<QuestaoRespostaPortal> {
    return request(`/portal/questoes/${questaoId}/responder`, {
      method: "POST",
      body: JSON.stringify({ resposta_dada }),
    });
  },

  statusTeste(): Promise<StatusTeste> {
    return request("/portal/teste-proficiencia/status");
  },

  questoesProficiencia(nivel: string, excluirIds: number[] = []): Promise<QuestaoPortal[]> {
    const qs = new URLSearchParams({ nivel });
    if (excluirIds.length) qs.set("excluir_ids", excluirIds.join(","));
    return request(`/portal/teste-proficiencia/questoes?${qs}`);
  },

  avaliarCompleto(respostas: { questao_id: number; resposta_dada: string }[]): Promise<{ nivel: string }> {
    return request("/portal/teste-proficiencia/avaliar-completo", {
      method: "POST",
      body: JSON.stringify({ respostas }),
    });
  },

  nivelProgresso(): Promise<NivelProgresso> {
    return request("/portal/nivel-progresso");
  },
};
