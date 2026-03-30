import { apiAuth } from "../api";
import { cached, invalidate } from "@/lib/cache";

export interface Nivel { id: number; nome: string; ordem: number; ativo: boolean; }

export const niveisService = {
  listar: (includeInactive = false) =>
    cached(`niveis:${includeInactive}`, () => apiAuth.get<Nivel[]>(`/niveis/?include_inactive=${includeInactive}`), 10 * 60 * 1000),
  // níveis raramente mudam — TTL de 10 minutos
  invalidar: () => invalidate("niveis:"),
};
