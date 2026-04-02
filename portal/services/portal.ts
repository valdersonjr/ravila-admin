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

function buildQueryString(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) qs.set(key, String(value));
  }
  const q = qs.toString();
  return q ? `?${q}` : "";
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
  contexto: string;
  topico: string;
  texto_apoio: string | null;
  midia_url: string | null;
  midia_tipo: string | null;
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

export interface AvaliacaoPortal {
  id: number;
  titulo: string;
  topico: string;
  modulo: string | null;
  descricao: string | null;
  data_aplicacao: string | null;
  hora_inicio: string | null;   // "HH:MM:SS"
  hora_fim: string | null;
  disponivel: boolean;
  status_aluno: string | null;   // aguardando_correcao | concluida | null
  nota_final: number | null;
  total_questoes: number;
}

export interface AvaliacaoQuestaoPortal {
  id: number;
  questao_id: number;
  ordem: number;
  peso: number;
  questao: QuestaoPortal;
}

export interface AvaliacaoDetalhePortal {
  id: number;
  titulo: string;
  topico: string;
  modulo: string | null;
  descricao: string | null;
  data_aplicacao: string | null;
  hora_fim: string | null;
  questoes: AvaliacaoQuestaoPortal[];
}

export interface ResultadoQuestao {
  questao_id: number;
  enunciado: string;
  subtipo: string;
  nivel: string;
  peso: number;
  texto_apoio: string | null;
  midia_url: string | null;
  midia_tipo: string | null;
  alternativas: string[] | null;
  resposta_dada: string | null;
  resposta_correta: string | null;
  acertou: boolean | null;
  nota_manual: number | null;      // 0.0–1.0
  comentario_professor: string | null;
  explicacao: string | null;
  corrigida: boolean;
}

export interface ResultadoAvaliacao {
  status: string;                  // aguardando_correcao | concluida
  nota_final: number | null;       // 0–100, só quando concluida
  nota_parcial: number | null;     // pontuação das já corrigidas
  total_peso: number;
  peso_corrigido: number;
  concluido_em: string | null;
  questoes: ResultadoQuestao[];
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
    return request(`/portal/aulas${buildQueryString(params)}`);
  },

  presencas(params?: { page?: number; page_size?: number }): Promise<PresencaPortal[]> {
    return request(`/portal/presencas${buildQueryString(params)}`);
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
    return request(`/portal/biblioteca${buildQueryString(params)}`);
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

  bancoquestoes(params?: { nivel?: string; contexto?: string; topico?: string; page?: number }): Promise<QuestaoPortal[]> {
    return request(`/portal/questoes${buildQueryString(params)}`);
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

  avaliacoes(): Promise<AvaliacaoPortal[]> {
    return request("/portal/avaliacoes");
  },

  avaliacaoDetalhe(id: number): Promise<AvaliacaoDetalhePortal> {
    return request(`/portal/avaliacoes/${id}`);
  },

  avaliacaoHorario(id: number): Promise<{ hora_fim: string | null; data_aplicacao: string | null }> {
    return request(`/portal/avaliacoes/${id}/horario`);
  },

  responderAvaliacao(id: number, respostas: { questao_id: number; resposta_dada: string }[]): Promise<{ status: string; nota_final: number | null }> {
    return request(`/portal/avaliacoes/${id}/responder`, {
      method: "POST",
      body: JSON.stringify({ respostas }),
    });
  },

  resultadoAvaliacao(id: number): Promise<ResultadoAvaliacao> {
    return request(`/portal/avaliacoes/${id}/resultado`);
  },
};
