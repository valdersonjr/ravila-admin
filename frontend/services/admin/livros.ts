import { apiAuth } from "../api";

export interface Livro {
  id: number;
  titulo: string;
  ativo: boolean;
}

export const livrosService = {
  listar: (includeInactive = false) =>
    apiAuth.get<Livro[]>(`/livros/?include_inactive=${includeInactive}`),
  criar: (data: { titulo: string }) =>
    apiAuth.post<Livro>("/livros/", data),
  atualizar: (id: number, data: Partial<{ titulo: string; ativo: boolean }>) =>
    apiAuth.patch<Livro>(`/livros/${id}`, data),
};
