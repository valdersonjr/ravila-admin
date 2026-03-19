import { apiAuth } from "../api";

export interface ReposicaoPendente {
  id: number;
  aluno_id: number;
  aula_origem_id: number;
  aula_reposicao_id: number | null;
  status: "pendente" | "usada";
  criada_em: string;
  aluno: {
    pessoa_id: number;
    pessoa: { id: number; nome: string; cpf: string | null };
  } | null;
  aula_origem: {
    id: number;
    data: string;
    hora_inicio: string;
    hora_fim: string;
    turma_id: number;
  } | null;
}

export const reposicoesService = {
  listar: (alunoId?: number) => {
    const qs = alunoId ? `?aluno_id=${alunoId}` : "";
    return apiAuth.get<ReposicaoPendente[]>(`/reposicoes${qs}`);
  },
  gerar: (alunoId: number, aulaOrigemId: number) =>
    apiAuth.post<ReposicaoPendente>(
      `/reposicoes?aluno_id=${alunoId}&aula_origem_id=${aulaOrigemId}`,
      {}
    ),
  usar: (reposicaoId: number, aulaReposicaoId: number) =>
    apiAuth.patch<ReposicaoPendente>(
      `/reposicoes/${reposicaoId}/usar?aula_reposicao_id=${aulaReposicaoId}`
    ),
};
