import { apiAuth } from "../api";

export interface User {
  pessoa_id: number;
  is_admin: boolean;
  is_secretario: boolean;
  ativo: boolean;
  pessoa: { id: number; nome: string; cpf: string } | null;
}

export const usersService = {
  listar: (role?: string) => {
    const qs = role ? `?role=${role}` : "";
    return apiAuth.get<User[]>(`/users/${qs}`);
  },
  criar: (data: { pessoa_id: number; senha: string; is_admin: boolean; is_secretario: boolean }) =>
    apiAuth.post<User>("/users/", data),
  atualizar: (pessoaId: number, data: { ativo?: boolean; is_admin?: boolean; is_secretario?: boolean; senha?: string }) =>
    apiAuth.patch<User>(`/users/${pessoaId}`, data),
  deletar: (pessoaId: number) =>
    apiAuth.delete<void>(`/users/${pessoaId}`),
};
