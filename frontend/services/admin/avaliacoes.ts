import { apiAuth } from "../api";
import type { Questao } from "./questoes";

export const STATUS_LABELS: Record<string, string> = {
  rascunho:  "Rascunho",
  publicada: "Publicada",
  encerrada: "Encerrada",
};

export const STATUS_COLORS: Record<string, string> = {
  rascunho:  "bg-border text-muted",
  publicada: "bg-emerald-100 text-emerald-700",
  encerrada: "bg-rose-100 text-rose-600",
};

export const STATUS_ALUNO_LABELS: Record<string, string> = {
  aguardando_correcao: "Aguardando correção",
  concluida:           "Concluída",
};

export interface AvaliacaoQuestaoItem {
  id: number;
  questao_id: number;
  ordem: number;
  peso: number;
  questao: Questao;
}

export interface AvaliacaoList {
  id: number;
  titulo: string;
  topico: string;
  modulo: string | null;
  turma_id: number;
  turma_nome: string | null;
  aula_id: number | null;
  data_aplicacao: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  status: string;
  criado_em: string;
  total_questoes: number;
  total_alunos: number;
}

export interface AvaliacaoDetail extends AvaliacaoList {
  descricao: string | null;
  criado_por_id: number | null;
  total_pendentes: number;
  questoes: AvaliacaoQuestaoItem[];
}

export interface AvaliacaoCreate {
  titulo: string;
  topico: string;
  modulo?: string;
  descricao?: string;
  turma_id: number;
  aula_id?: number;
  data_aplicacao?: string;
  hora_inicio?: string;
  hora_fim?: string;
  questoes?: { questao_id: number; ordem: number; peso: number }[];
}

export interface RespostaAluno {
  questao_id: number;
  codigo: string;
  enunciado: string;
  subtipo: string;
  peso: number;
  resposta_dada: string | null;
  acertou: boolean | null;
  nota_manual: number | null;
  comentario_professor: string | null;
  corrigida: boolean;
}

export const avaliacoesService = {
  listar: (params?: {
    turma_id?: number;
    status?: string;
    topico?: string;
    modulo?: string;
    page?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.turma_id) qs.set("turma_id", String(params.turma_id));
    if (params?.status) qs.set("status", params.status);
    if (params?.topico) qs.set("topico", params.topico);
    if (params?.modulo) qs.set("modulo", params.modulo);
    if (params?.page) qs.set("page", String(params.page));
    return apiAuth.get<AvaliacaoList[]>(`/avaliacoes/${qs.toString() ? `?${qs}` : ""}`);
  },

  buscar: (id: number) => apiAuth.get<AvaliacaoDetail>(`/avaliacoes/${id}`),

  criar: (data: AvaliacaoCreate) => apiAuth.post<AvaliacaoDetail>("/avaliacoes/", data),

  atualizar: (id: number, data: Partial<AvaliacaoCreate>) =>
    apiAuth.patch<AvaliacaoDetail>(`/avaliacoes/${id}`, data),

  publicar: (id: number) => apiAuth.post<AvaliacaoDetail>(`/avaliacoes/${id}/publicar`, {}),

  encerrar: (id: number) => apiAuth.post<AvaliacaoDetail>(`/avaliacoes/${id}/encerrar`, {}),

  adicionarQuestao: (id: number, item: { questao_id: number; ordem: number; peso: number }) =>
    apiAuth.post<AvaliacaoDetail>(`/avaliacoes/${id}/questoes`, item),

  removerQuestao: (id: number, questaoId: number) =>
    apiAuth.delete<AvaliacaoDetail>(`/avaliacoes/${id}/questoes/${questaoId}`),

  respostasAluno: (id: number, alunoId: number) =>
    apiAuth.get<RespostaAluno[]>(`/avaliacoes/${id}/respostas/${alunoId}`),

  corrigir: (id: number, alunoId: number, questaoId: number, nota_manual: number, comentario?: string) =>
    apiAuth.patch<RespostaAluno>(`/avaliacoes/${id}/corrigir/${alunoId}/${questaoId}`, {
      nota_manual,
      comentario_professor: comentario,
    }),
};
