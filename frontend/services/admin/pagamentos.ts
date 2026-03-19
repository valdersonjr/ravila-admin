import { apiAuth } from "../api";

export interface PagamentoAluno {
  id: number;
  aluno_id: number;
  aluno_nome_snapshot: string;
  referencia: string;
  valor: number;
  status: "pendente" | "pago" | "atrasado";
  forma: "boleto" | "pix" | null;
  data_pagamento: string | null;
  comprovante_url: string | null;
}

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

export const pagamentosAlunosService = {
  listar: (params?: { aluno_id?: number; referencia?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.aluno_id) qs.set("aluno_id", String(params.aluno_id));
    if (params?.referencia) qs.set("referencia", params.referencia);
    if (params?.status) qs.set("status", params.status);
    return apiAuth.get<PagamentoAluno[]>(`/pagamentos/alunos/${qs.toString() ? `?${qs}` : ""}`);
  },
  criar: (data: { aluno_id: number; referencia: string; valor: number }) => apiAuth.post<PagamentoAluno>("/pagamentos/alunos/", data),
  atualizar: (id: number, data: { status?: string; forma?: string; data_pagamento?: string }) => apiAuth.patch<PagamentoAluno>(`/pagamentos/alunos/${id}`, data),
  uploadComprovante: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiAuth.upload<PagamentoAluno>(`/pagamentos/alunos/${id}/comprovante`, fd);
  },
};

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
  listar: (role?: string) => apiAuth.get<any[]>(`/users/${role ? `?role=${role}` : ""}`),
  criar: (data: { pessoa_id: number; senha: string; role: string }) => apiAuth.post<any>("/users/", data),
  atualizar: (pessoaId: number, data: { role?: string; senha?: string; ativo?: boolean }) => apiAuth.put<any>(`/users/${pessoaId}`, data),
};
