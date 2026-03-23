import { apiAuth } from "../api";
import type { GerarSemanaRelatorio } from "./turmas";

export interface Professor {
  pessoa_id: number;
  ativo: boolean;
  pessoa: { id: number; nome: string; cpf: string; email: string | null; telefone: string | null; };
}

export interface ProfessorCreate {
  pessoa_id: number;
}

export interface ProfessorDashboard {
  professor_id: number;
  nome: string;
  cpf: string | null;
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
  historico_mensal: {
    mes: string;
    realizadas: number;
    canceladas: number;
    presenca_media: number | null;
  }[];
}

export const professoresService = {
  listar: () => apiAuth.get<Professor[]>("/professores/"),
  buscar: (pessoaId: number) => apiAuth.get<Professor>(`/professores/${pessoaId}`),
  criar: (data: ProfessorCreate) => apiAuth.post<Professor>("/professores/", data),
  atualizar: (pessoaId: number, data: { ativo?: boolean }) => apiAuth.put<Professor>(`/professores/${pessoaId}`, data),
  dashboard: (pessoaId: number) => apiAuth.get<ProfessorDashboard>(`/professores/${pessoaId}/dashboard`),
  gerarSemana: (pessoaId: number, dry_run: boolean) => apiAuth.post<GerarSemanaRelatorio>(`/professores/${pessoaId}/gerar-semana`, { dry_run }),
};
