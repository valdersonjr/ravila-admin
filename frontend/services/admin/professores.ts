import { apiAuth } from "../api";

export interface Professor {
  pessoa_id: number;
  tipo_contrato: "clt" | "pj";
  salario: number | null;
  valor_por_aula: number | null;
  ativo: boolean;
  pessoa: { id: number; nome: string; cpf: string; email: string | null; telefone: string | null; };
}

export interface ProfessorCreate {
  pessoa_id: number;
  tipo_contrato: "clt" | "pj";
  salario?: number;
  valor_por_aula?: number;
}

export interface ProfessorDashboard {
  professor_id: number;
  nome: string;
  cpf: string;
  tipo_contrato: "clt" | "pj";
  salario: number | null;
  valor_por_aula: number | null;
  ativo: boolean;
  turmas: { id: number; nome: string; status: string; num_alunos: number }[];
  aulas: {
    total: number;
    realizadas: number;
    canceladas: number;
    agendadas: number;
    mes_atual: { realizadas: number; agendadas: number; canceladas: number; presenca_media: number | null };
  };
  presenca_media: number | null;
  custo_total_pago: number;
  custo_mes_atual: number | null;
  historico_mensal: {
    mes: string;
    realizadas: number;
    canceladas: number;
    presenca_media: number | null;
  }[];
  historico_pagamentos: {
    id: number;
    referencia: string;
    valor_total: number;
    aulas_realizadas_snapshot: number | null;
    forma: string | null;
    data_pagamento: string | null;
  }[];
}

export const professoresService = {
  listar: () => apiAuth.get<Professor[]>("/professores/"),
  buscar: (pessoaId: number) => apiAuth.get<Professor>(`/professores/${pessoaId}`),
  criar: (data: ProfessorCreate) => apiAuth.post<Professor>("/professores/", data),
  atualizar: (pessoaId: number, data: Partial<ProfessorCreate>) => apiAuth.put<Professor>(`/professores/${pessoaId}`, data),
  dashboard: (pessoaId: number) => apiAuth.get<ProfessorDashboard>(`/professores/${pessoaId}/dashboard`),
};
