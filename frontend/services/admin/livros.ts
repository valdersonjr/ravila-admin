import { apiAuth } from "../api";

export interface Livro {
  id: number;
  titulo: string;
  serie: string | null;
  ativo: boolean;
}

export const livrosService = {
  listar: (includeInactive = false) =>
    apiAuth.get<Livro[]>(`/livros/?include_inactive=${includeInactive}`),
  criar: (data: { titulo: string; serie?: string }) =>
    apiAuth.post<Livro>("/livros/", data),
  atualizar: (id: number, data: Partial<{ titulo: string; serie: string | null; ativo: boolean }>) =>
    apiAuth.patch<Livro>(`/livros/${id}`, data),
};
