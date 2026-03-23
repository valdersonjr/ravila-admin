import { apiAuth } from "../api";

export interface PagamentoProfessor {
  id: number;
  professor_id: number;
  professor_nome_snapshot: string;
  tipo_contrato_snapshot: string;
  referencia: string;
  valor_total: number;
  aulas_realizadas_snapshot: number | null;
  forma: string | null;
  data_pagamento: string | null;
  comprovante_url: string | null;
}

export const pagamentosProfessoresService = {
  listar: (params?: { professor_id?: number; referencia?: string }) => {
    const qs = new URLSearchParams();
    if (params?.professor_id) qs.set("professor_id", String(params.professor_id));
    if (params?.referencia) qs.set("referencia", params.referencia);
    return apiAuth.get<PagamentoProfessor[]>(`/pagamentos/professores/${qs.toString() ? `?${qs}` : ""}`);
  },
  criar: (data: { professor_id: number; referencia: string; valor_total: number; aulas_realizadas_snapshot?: number }) => apiAuth.post<PagamentoProfessor>("/pagamentos/professores/", data),
  atualizar: (id: number, data: { forma?: string; data_pagamento?: string }) => apiAuth.patch<PagamentoProfessor>(`/pagamentos/professores/${id}`, data),
  uploadComprovante: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiAuth.upload<PagamentoProfessor>(`/pagamentos/professores/${id}/comprovante`, fd);
  },
  calcular: (professor_id: number, referencia: string) =>
    apiAuth.get<{ aulas_realizadas: number; valor_por_aula: number; valor_calculado: number }>(`/pagamentos/professores/calcular?professor_id=${professor_id}&referencia=${encodeURIComponent(referencia)}`),
};

export const usersService = {
  listar: (is_admin?: boolean) => apiAuth.get<any[]>(`/users/${is_admin !== undefined ? `?is_admin=${is_admin}` : ""}`),
  criar: (data: { pessoa_id: number; senha: string; is_admin: boolean }) => apiAuth.post<any>("/users/", data),
  atualizar: (pessoaId: number, data: { is_admin?: boolean; senha?: string; ativo?: boolean }) => apiAuth.put<any>(`/users/${pessoaId}`, data),
};
