import { apiAuth } from "../api";

export interface Aluno {
  pessoa_id: number;
  status: "ativo" | "inativo";
  nivel: { id: number; nome: string } | null;
  responsavel: { id: number; nome: string } | null;
  pessoa: { id: number; nome: string; cpf: string; email: string | null; telefone: string | null; data_nascimento: string | null; };
}

export interface AlunoCreate {
  pessoa_id: number;
  nivel_id?: number;
  responsavel_id?: number;
}

export const alunosService = {
  listar: (params?: { status?: string; inadimplente?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.inadimplente) qs.set("inadimplente", "true");
    return apiAuth.get<Aluno[]>(`/alunos/${qs.toString() ? `?${qs}` : ""}`);
  },
  buscar: (pessoaId: number) => apiAuth.get<Aluno>(`/alunos/${pessoaId}`),
  criar: (data: AlunoCreate) => apiAuth.post<Aluno>("/alunos/", data),
  atualizar: (pessoaId: number, data: Partial<AlunoCreate> & { status?: string }) => apiAuth.put<Aluno>(`/alunos/${pessoaId}`, data),
};
