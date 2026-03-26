import { apiAuth } from "../api";

export interface Aluno {
  pessoa_id: number;
  status: "ativo" | "inativo";
  tem_contrato_ativo: boolean;
  aniversario: string | null;
  data_nascimento: string | null;
  nivel: { id: number; nome: string } | null;
  responsavel: { id: number; nome: string; cpf: string | null } | null;
  pessoa: { id: number; nome: string; cpf: string | null; email: string | null; telefone: string | null; menor_de_idade: boolean; };
  matriculas: { id: number; status: string; turma: { id: number; nome: string } | null }[];
}

export interface AlunoListOut {
  items: Aluno[];
  total: number;
  page: number;
  page_size: number;
}

export interface AlunoCreate {
  pessoa_id: number;
  nivel_id?: number;
  responsavel_id?: number;
  aniversario?: string;
  data_nascimento?: string;
}

// status é calculado no backend com base em matrículas ativas em turmas ativas

export const alunosService = {
  listar: (params?: { status?: string; search?: string; nivel_id?: number; sem_contrato_ativo?: boolean; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.nivel_id) qs.set("nivel_id", String(params.nivel_id));
    if (params?.sem_contrato_ativo) qs.set("sem_contrato_ativo", "true");
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    return apiAuth.get<AlunoListOut>(`/alunos/${qs.toString() ? `?${qs}` : ""}`);
  },
  aniversarios: () => apiAuth.get<Aluno[]>("/alunos/aniversarios"),
  buscar: (pessoaId: number) => apiAuth.get<Aluno>(`/alunos/${pessoaId}`),
  criar: (data: AlunoCreate) => apiAuth.post<Aluno>("/alunos/", data),
  atualizar: (pessoaId: number, data: Partial<AlunoCreate>) => apiAuth.put<Aluno>(`/alunos/${pessoaId}`, data),
};
