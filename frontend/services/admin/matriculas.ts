import { apiAuth } from "../api";

export interface Matricula {
  id: number;
  aluno_id: number;
  turma_id: number;
  data_inicio: string;
  data_fim: string | null;
  status: "ativa" | "cancelada" | "concluida";
  aluno: { pessoa_id: number; pessoa: { nome: string; cpf: string } } | null;
  turma: { id: number; nome: string } | null;
}

export const matriculasService = {
  listar: (params?: { aluno_id?: number; turma_id?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.aluno_id) qs.set("aluno_id", String(params.aluno_id));
    if (params?.turma_id) qs.set("turma_id", String(params.turma_id));
    if (params?.status) qs.set("status", params.status);
    return apiAuth.get<Matricula[]>(`/matriculas/${qs.toString() ? `?${qs}` : ""}`);
  },
  criar: (data: { aluno_id: number; turma_id: number; data_inicio: string }) => apiAuth.post<Matricula>("/matriculas/", data),
  atualizarStatus: (id: number, data: { status: string; data_fim?: string }) => apiAuth.patch<Matricula>(`/matriculas/${id}/status`, data),
};
