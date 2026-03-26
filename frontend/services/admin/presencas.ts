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

export interface PresencaDoAluno {
  id: number;
  aula_id: number;
  tipo: string;
  presente: boolean;
  aula: {
    id: number;
    data: string;
    hora_inicio: string;
    hora_fim: string;
    tipo: string;
    turma: { id: number; nome: string } | null;
  };
}

export interface PresencaDoAlunoListOut {
  items: PresencaDoAluno[];
  total: number;
  page: number;
  page_size: number;
}

export const presencasService = {
  listarPorAluno: (alunoId: number, page = 1, pageSize = 20) =>
    apiAuth.get<PresencaDoAlunoListOut>(`/alunos/${alunoId}/presencas?page=${page}&page_size=${pageSize}`),
  listarPorAula: (aulaId: number) => apiAuth.get<Presenca[]>(`/aulas/${aulaId}/presencas`),
  adicionar: (aulaId: number, item: { aluno_id: number; tipo: string; presente: boolean }) =>
    apiAuth.post<Presenca>(`/aulas/${aulaId}/presencas`, item),
  registrarBatch: (aulaId: number, presencas: { aluno_id: number; tipo: string; presente: boolean }[]) =>
    apiAuth.post<Presenca[]>(`/aulas/${aulaId}/presencas/batch`, { presencas }),
};
