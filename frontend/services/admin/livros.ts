import { apiAuth } from "../api";

export interface Livro {
  id: number;
  titulo: string;
  serie: string | null;
  ordem: number;
  ativo: boolean;
}

export const livrosService = {
  listar: (includeInactive = false) =>
    apiAuth.get<Livro[]>(`/livros/?include_inactive=${includeInactive}`),
  criar: (data: { titulo: string; serie?: string; ordem: number }) =>
    apiAuth.post<Livro>("/livros/", data),
  atualizar: (id: number, data: Partial<{ titulo: string; serie: string | null; ordem: number; ativo: boolean }>) =>
    apiAuth.patch<Livro>(`/livros/${id}`, data),
};
