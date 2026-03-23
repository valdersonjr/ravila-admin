import { apiAuth } from "../api";

export interface HorarioTurma { id: number; dia_semana: number; hora_inicio: string; hora_fim: string; }
export interface Turma {
  id: number;
  nome: string;
  status: "ativa" | "encerrada";
  nivel: { id: number; nome: string } | null;
  livro: { id: number; titulo: string; serie: string | null } | null;
  professor: { pessoa_id: number; pessoa: { nome: string } } | null;
  horarios: HorarioTurma[];
}

export interface GerarSemanaItem {
  turma_id: number;
  turma_nome: string;
  professor_nome: string;
  aulas_a_criar: number;
  sem_horario: boolean;
  conflitos: string[];
}

export interface GerarSemanaRelatorio {
  data_inicio: string;
  data_fim: string;
  itens: GerarSemanaItem[];
  total_aulas: number;
}

export const turmasService = {
  listar: (params?: { professor_id?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.professor_id) qs.set("professor_id", String(params.professor_id));
    if (params?.status) qs.set("status", params.status);
    return apiAuth.get<Turma[]>(`/turmas/${qs.toString() ? `?${qs}` : ""}`);
  },
  buscar: (id: number) => apiAuth.get<Turma>(`/turmas/${id}`),
  criar: (data: { nome: string; nivel_id?: number; livro_id?: number; professor_id: number }) => apiAuth.post<Turma>("/turmas/", data),
  atualizar: (id: number, data: { nome?: string; nivel_id?: number; livro_id?: number; professor_id?: number; status?: string }) => apiAuth.put<Turma>(`/turmas/${id}`, data),
  adicionarHorario: (turmaId: number, data: { dia_semana: number; hora_inicio: string; hora_fim: string }) => apiAuth.post<HorarioTurma>(`/turmas/${turmaId}/horarios`, data),
  removerHorario: (turmaId: number, horarioId: number) => apiAuth.delete<void>(`/turmas/${turmaId}/horarios/${horarioId}`),
  gerarAulas: (turmaId: number, data: { data_inicio: string; data_fim: string }) => apiAuth.post<{ criadas: number }>(`/turmas/${turmaId}/gerar-aulas`, data),
  gerarSemana: (dry_run: boolean) => apiAuth.post<GerarSemanaRelatorio>("/turmas/gerar-semana", { dry_run }),
};
