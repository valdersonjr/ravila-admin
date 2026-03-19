import { apiAuth } from "../api";

export interface Presenca {
  id: number;
  aula_id: number;
  aluno_id: number;
  tipo: "matriculado" | "experimental" | "substituto";
  presente: boolean;
  aluno: { pessoa_id: number; pessoa: { nome: string } } | null;
  pessoa: { id: number; nome: string; cpf: string } | null;
}

export const presencasService = {
  listarPorAula: (aulaId: number) => apiAuth.get<Presenca[]>(`/aulas/${aulaId}/presencas`),
  adicionar: (aulaId: number, item: { aluno_id: number; tipo: string; presente: boolean }) =>
    apiAuth.post<Presenca>(`/aulas/${aulaId}/presencas`, item),
  registrarBatch: (aulaId: number, presencas: { aluno_id: number; tipo: string; presente: boolean }[]) =>
    apiAuth.post<Presenca[]>(`/aulas/${aulaId}/presencas/batch`, { presencas }),
};
