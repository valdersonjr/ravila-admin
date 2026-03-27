import { api } from "../api";

export const NIVEIS_CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export interface NivelInglesAluno {
  pessoa_id: number;
  nome: string;
  nivel_atual: string | null;
  avaliado_em: string | null;
  total_respondidas: number;
  acertos: number;
  percentual: number;
}

export const nivelInglesService = {
  listar(): Promise<NivelInglesAluno[]> {
    return api.get("/alunos/nivel-ingles");
  },

  atualizar(pessoaId: number, nivel: string): Promise<void> {
    return api.patch(`/alunos/${pessoaId}/nivel-ingles`, { nivel });
  },

  liberarReavaliacao(pessoaId: number): Promise<void> {
    return api.post(`/alunos/${pessoaId}/nivel-ingles/liberar-reavaliacao`, {});
  },
};
