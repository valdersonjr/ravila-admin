import { apiAuth } from "../api";

export interface Aula {
  id: number;
  turma_id: number | null;
  aluno_id: number | null;
  aluno_nome_snapshot: string | null;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  professor_id: number;
  professor_nome_snapshot: string;
  tipo: "regular" | "substitutiva";
  status: "agendada" | "realizada" | "cancelada" | "pendente_aprovacao";
  aula_origem_id: number | null;
  descricao: string | null;
  turma: { id: number; nome: string; professor_id: number } | null;
}

export interface AulaListOut {
  items: Aula[];
  total: number;
  page: number;
  page_size: number;
}

export const aulasService = {
  listar: (params?: {
    turma_id?: number;
    professor_id?: number;
    aluno_id?: number;
    data_inicio?: string;
    data_fim?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.turma_id) qs.set("turma_id", String(params.turma_id));
    if (params?.professor_id) qs.set("professor_id", String(params.professor_id));
    if (params?.aluno_id) qs.set("aluno_id", String(params.aluno_id));
    if (params?.data_inicio) qs.set("data_inicio", params.data_inicio);
    if (params?.data_fim) qs.set("data_fim", params.data_fim);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    return apiAuth.get<AulaListOut>(`/aulas/${qs.toString() ? `?${qs}` : ""}`);
  },
  buscar: (id: number) => apiAuth.get<Aula>(`/aulas/${id}`),
  criar: (data: { turma_id: number; data: string; hora_inicio: string; hora_fim: string; professor_id: number; tipo?: string }) =>
    apiAuth.post<Aula>("/aulas/", data),
  criarAvulsa: (data: { aluno_id: number; professor_id: number; data: string; hora_inicio: string; hora_fim: string; descricao?: string }) =>
    apiAuth.post<Aula>("/aulas/avulsa", data),
  atualizarStatus: (id: number, status: string) => apiAuth.patch<Aula>(`/aulas/${id}/status`, { status }),
  remarcar: (id: number, data: { data: string; hora_inicio: string; hora_fim: string }) =>
    apiAuth.post<Aula>(`/aulas/${id}/remarcar`, data),
  substituirProfessor: (id: number, professor_id: number) =>
    apiAuth.patch<Aula>(`/aulas/${id}/professor`, { professor_id }),
  aprovar: (id: number) => apiAuth.patch<Aula>(`/aulas/${id}/aprovar`, {}),
  atualizarDescricao: (id: number, descricao: string | null) =>
    apiAuth.patch<Aula>(`/aulas/${id}/descricao`, { descricao }),
  deletar: (id: number) => apiAuth.delete<void>(`/aulas/${id}`),
};
