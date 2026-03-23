import { apiAuth } from "../api";

export interface User {
  id: number;
  username: string;
  pessoa_id: number | null;
  is_admin: boolean;
  is_secretario: boolean;
  ativo: boolean;
  pessoa: { id: number; nome: string; cpf: string | null } | null;
}

export const usersService = {
  listar: (role?: string) => {
    const qs = role ? `?role=${role}` : "";
    return apiAuth.get<User[]>(`/users/${qs}`);
  },
  criar: (data: { username: string; senha: string; is_admin: boolean; is_secretario: boolean; pessoa_id?: number }) =>
    apiAuth.post<User>("/users/", data),
  atualizar: (userId: number, data: { ativo?: boolean; is_admin?: boolean; is_secretario?: boolean; senha?: string; username?: string; pessoa_id?: number | null }) =>
    apiAuth.patch<User>(`/users/${userId}`, data),
  deletar: (userId: number) =>
    apiAuth.delete<void>(`/users/${userId}`),
};
