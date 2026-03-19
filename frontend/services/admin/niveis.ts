import { apiAuth } from "../api";

export interface Nivel { id: number; nome: string; ordem: number; ativo: boolean; }
export interface NivelCreate { nome: string; ordem: number; }

export const niveisService = {
  listar: (includeInactive = false) => apiAuth.get<Nivel[]>(`/niveis/?include_inactive=${includeInactive}`),
  criar: (data: NivelCreate) => apiAuth.post<Nivel>("/niveis/", data),
  atualizar: (id: number, data: Partial<NivelCreate>) => apiAuth.put<Nivel>(`/niveis/${id}`, data),
  deletar: (id: number) => apiAuth.delete<void>(`/niveis/${id}`),
};
