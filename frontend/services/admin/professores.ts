import { apiAuth, api } from "../api";
import { cached, invalidate } from "@/lib/cache";
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
  listar: () => cached("professores:listar", () => apiAuth.get<Professor[]>("/professores/")),
  buscar: (pessoaId: number) => apiAuth.get<Professor>(`/professores/${pessoaId}`),
  criar: (data: ProfessorCreate) => apiAuth.post<Professor>("/professores/", data).then((r) => { invalidate("professores:"); return r; }),
  atualizar: (pessoaId: number, data: { ativo?: boolean }) => apiAuth.put<Professor>(`/professores/${pessoaId}`, data).then((r) => { invalidate("professores:"); return r; }),
  dashboard: (pessoaId: number) => apiAuth.get<ProfessorDashboard>(`/professores/${pessoaId}/dashboard`),
  gerarSemana: (pessoaId: number, dry_run: boolean) => apiAuth.post<GerarSemanaRelatorio>(`/professores/${pessoaId}/gerar-semana`, { dry_run }),
  exportarAgendaPdf: (pessoaId: number, semanaInicio: string) =>
    api.getBlob(`/professores/${pessoaId}/agenda/pdf?semana_inicio=${semanaInicio}`),
};
