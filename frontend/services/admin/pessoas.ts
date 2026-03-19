import { apiAuth } from "../api";

export interface Pessoa {
  id: number;
  nome: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  menor_de_idade: boolean;
}

export interface PessoaCreate {
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  menor_de_idade?: boolean;
}

export const pessoasService = {
  listar: (search?: string) => apiAuth.get<Pessoa[]>(`/pessoas/${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  buscar: (id: number) => apiAuth.get<Pessoa>(`/pessoas/${id}`),
  criar: (data: PessoaCreate) => apiAuth.post<Pessoa>("/pessoas/", data),
  atualizar: (id: number, data: Partial<PessoaCreate>) => apiAuth.put<Pessoa>(`/pessoas/${id}`, data),
};
