import { apiAuth } from "../api";

export interface Aula {
  id: number;
  turma_id: number;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  professor_id: number;
  professor_nome_snapshot: string;
  tipo: "regular" | "substitutiva";
  status: "agendada" | "realizada" | "cancelada" | "pendente_aprovacao";
  aula_origem_id: number | null;
  turma: { id: number; nome: string; professor_id: number } | null;
}

export const aulasService = {
  listar: (params?: { turma_id?: number; professor_id?: number; data_inicio?: string; data_fim?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.turma_id) qs.set("turma_id", String(params.turma_id));
    if (params?.professor_id) qs.set("professor_id", String(params.professor_id));
    if (params?.data_inicio) qs.set("data_inicio", params.data_inicio);
    if (params?.data_fim) qs.set("data_fim", params.data_fim);
    if (params?.status) qs.set("status", params.status);
    return apiAuth.get<Aula[]>(`/aulas/${qs.toString() ? `?${qs}` : ""}`);
  },
  buscar: (id: number) => apiAuth.get<Aula>(`/aulas/${id}`),
  criar: (data: { turma_id: number; data: string; hora_inicio: string; hora_fim: string; professor_id: number; tipo?: string }) => apiAuth.post<Aula>("/aulas/", data),
  atualizarStatus: (id: number, status: string) => apiAuth.patch<Aula>(`/aulas/${id}/status`, { status }),
  remarcar: (id: number, data: { data: string; hora_inicio: string; hora_fim: string }) => apiAuth.post<Aula>(`/aulas/${id}/remarcar`, data),
  substituirProfessor: (id: number, professor_id: number) => apiAuth.patch<Aula>(`/aulas/${id}/professor`, { professor_id }),
  aprovar: (id: number) => apiAuth.patch<Aula>(`/aulas/${id}/aprovar`, {}),
};
