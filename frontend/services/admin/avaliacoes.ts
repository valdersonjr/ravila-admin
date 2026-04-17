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
  topicos: string[];
  modulo: string | null;
  tipo: string;
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
  aula_data: string | null;
  aula_hora_inicio: string | null;
  aula_hora_fim: string | null;
}

export interface AvaliacaoCreate {
  titulo: string;
  topicos: string[];
  modulo?: string;
  descricao?: string;
  tipo?: string;
  turma_id: number;
  aula_id?: number;
  data_aplicacao?: string;
  hora_inicio?: string;
  hora_fim?: string;
  questoes?: { questao_id: number; ordem: number; peso: number }[];
}

export interface AvaliacaoAluno {
  aluno_id: number;
  nome: string;
  status: string;
  nota_final: number | null;
  iniciado_em: string;
  concluido_em: string | null;
}

export interface AvaliacaoDesempenhoAluno {
  id: number;
  titulo: string;
  turma_id: number;
  turma_nome: string | null;
  data_aplicacao: string | null;
  status: string;
  total_questoes: number;
  status_aluno: string;
  nota_final: number | null;
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
    professor_id?: number;
    status?: string;
    topico?: string;
    modulo?: string;
    data_inicio?: string;
    data_fim?: string;
    page?: number;
    page_size?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.turma_id) qs.set("turma_id", String(params.turma_id));
    if (params?.professor_id) qs.set("professor_id", String(params.professor_id));
    if (params?.status) qs.set("status", params.status);
    if (params?.topico) qs.set("topico", params.topico);
    if (params?.modulo) qs.set("modulo", params.modulo);
    if (params?.data_inicio) qs.set("data_inicio", params.data_inicio);
    if (params?.data_fim) qs.set("data_fim", params.data_fim);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
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

  lancarNotas: (id: number, notas: { aluno_id: number; nota: number | null }[]) =>
    apiAuth.post<void>(`/avaliacoes/${id}/lancar-notas`, { notas }),

  listarAlunos: (id: number) =>
    apiAuth.get<AvaliacaoAluno[]>(`/avaliacoes/${id}/alunos`),

  listarPorAluno: (alunoId: number) =>
    apiAuth.get<AvaliacaoDesempenhoAluno[]>(`/avaliacoes/por-aluno/${alunoId}`),

  respostasAluno: (id: number, alunoId: number) =>
    apiAuth.get<RespostaAluno[]>(`/avaliacoes/${id}/respostas/${alunoId}`),

  deletar: (id: number) => apiAuth.delete<void>(`/avaliacoes/${id}`),

  corrigir: (id: number, alunoId: number, questaoId: number, nota_manual: number, comentario?: string) =>
    apiAuth.patch<RespostaAluno>(`/avaliacoes/${id}/corrigir/${alunoId}/${questaoId}`, {
      nota_manual,
      comentario_professor: comentario,
    }),
};
