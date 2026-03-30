import { apiAuth } from "../api";
import { cached, invalidate } from "@/lib/cache";

export interface Pessoa {
  id: number;
  nome: string;
  cpf: string;
  rg: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  menor_de_idade: boolean;
}

export interface PessoaCreate {
  nome: string;
  cpf?: string;
  rg?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  menor_de_idade?: boolean;
}

export interface PessoaListOut {
  items: Pessoa[];
  total: number;
  page: number;
  page_size: number;
}

export const pessoasService = {
  listar: (params?: { search?: string; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const url = `/pessoas/${qs.toString() ? `?${qs}` : ""}`;
    if ((params?.page_size ?? 0) >= 500 && !params?.search) {
      return cached(`pessoas:${url}`, () => apiAuth.get<PessoaListOut>(url));
    }
    return apiAuth.get<PessoaListOut>(url);
  },
  buscar: (id: number) => apiAuth.get<Pessoa>(`/pessoas/${id}`),
  criar: (data: PessoaCreate) => apiAuth.post<Pessoa>("/pessoas/", data).then((r) => { invalidate("pessoas:"); return r; }),
  atualizar: (id: number, data: Partial<PessoaCreate>) => apiAuth.put<Pessoa>(`/pessoas/${id}`, data).then((r) => { invalidate("pessoas:"); return r; }),
};
