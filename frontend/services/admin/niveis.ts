import { apiAuth } from "../api";

export interface Nivel { id: number; nome: string; ordem: number; ativo: boolean; }

export const niveisService = {
  listar: (includeInactive = false) => apiAuth.get<Nivel[]>(`/niveis/?include_inactive=${includeInactive}`),
};
