import { apiAuth } from "../api";
import { cached, invalidate } from "@/lib/cache";

export interface HorarioTurma { id: number; dia_semana: number; hora_inicio: string; hora_fim: string; }
export interface Turma {
  id: number;
  nome: string;
  status: "ativa" | "encerrada";
  livro: string | null;
  professor: { pessoa_id: number; pessoa: { nome: string } } | null;
  horarios: HorarioTurma[];
}

export interface TurmaListOut {
  items: Turma[];
  total: number;
  page: number;
  page_size: number;
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
  listar: (params?: { professor_id?: number; status?: string; search?: string; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.professor_id) qs.set("professor_id", String(params.professor_id));
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const url = `/turmas/${qs.toString() ? `?${qs}` : ""}`;
    // Cacheia apenas listas completas usadas em dropdowns (sem busca textual)
    if ((params?.page_size ?? 0) >= 500 && !params?.search) {
      return cached(`turmas:${url}`, () => apiAuth.get<TurmaListOut>(url));
    }
    return apiAuth.get<TurmaListOut>(url);
  },
  buscar: (id: number) => apiAuth.get<Turma>(`/turmas/${id}`),
  criar: (data: { nome: string; livro?: string; professor_id: number }) => apiAuth.post<Turma>("/turmas/", data).then((r) => { invalidate("turmas:"); return r; }),
  atualizar: (id: number, data: { nome?: string; livro?: string; professor_id?: number; status?: string }) => apiAuth.put<Turma>(`/turmas/${id}`, data).then((r) => { invalidate("turmas:"); return r; }),
  adicionarHorario: (turmaId: number, data: { dia_semana: number; hora_inicio: string; hora_fim: string }) => apiAuth.post<HorarioTurma>(`/turmas/${turmaId}/horarios`, data).then((r) => { invalidate("turmas:"); return r; }),
  deletar: (id: number) => apiAuth.delete<void>(`/turmas/${id}`).then((r) => { invalidate("turmas:"); return r; }),
  removerHorario: (turmaId: number, horarioId: number) => apiAuth.delete<void>(`/turmas/${turmaId}/horarios/${horarioId}`).then((r) => { invalidate("turmas:"); return r; }),
  gerarAulas: (turmaId: number, data: { data_inicio: string; data_fim: string }) => apiAuth.post<{ criadas: number }>(`/turmas/${turmaId}/gerar-aulas`, data),
  gerarSemana: (dry_run: boolean) => apiAuth.post<GerarSemanaRelatorio>("/turmas/gerar-semana", { dry_run }),
};
