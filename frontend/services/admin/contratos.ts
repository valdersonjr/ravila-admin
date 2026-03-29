import { apiAuth } from "../api";
import type { Aluno } from "./alunos";

export interface Contrato {
  id: number;
  contratante_id: number;
  tipo: "formal" | "informal";
  curso: string;
  valor_mensalidade: string;
  desconto_percentual: string | null;
  desconto_valor: string | null;
  dia_vencimento: number;
  valor_reposicao_hora: string;
  data_inicio: string;
  data_fim: string;
  data_assinatura: string | null;
  local_assinatura: string | null;
  observacoes: string | null;
  status: "rascunho" | "ativo" | "encerrado" | "rescindido";
  contrato_assinado_key: string | null;
  created_at: string;
  alunos: Aluno[];
  contratante: { id: number; nome: string; cpf: string | null; endereco: string | null; telefone: string | null; };
}

export interface ContratoListOut {
  items: Contrato[];
  total: number;
  page: number;
  page_size: number;
}

export interface ContratoCreate {
  aluno_ids: number[];
  contratante_id: number;
  tipo?: "formal" | "informal";
  curso: string;
  valor_mensalidade: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  dia_vencimento?: number;
  valor_reposicao_hora?: number;
  data_inicio: string;
  data_fim: string;
  data_assinatura?: string;
  local_assinatura?: string;
  observacoes?: string;
}

export const contratosService = {
  listar: (params?: { status?: string; aluno_id?: number; search?: string; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.aluno_id) qs.set("aluno_id", String(params.aluno_id));
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    return apiAuth.get<ContratoListOut>(`/contratos/${qs.toString() ? `?${qs}` : ""}`);
  },
  buscar: (id: number) => apiAuth.get<Contrato>(`/contratos/${id}`),
  criar: (data: ContratoCreate) => apiAuth.post<Contrato>("/contratos/", data),
  atualizar: (id: number, data: Partial<ContratoCreate>) => apiAuth.put<Contrato>(`/contratos/${id}`, data),
  atualizarStatus: (id: number, status: Contrato["status"]) =>
    apiAuth.patch<Contrato>(`/contratos/${id}/status`, { status }),
  pdf: (id: number) => apiAuth.getBlob(`/contratos/${id}/pdf`),
  instrucoesGerais: (id: number) => apiAuth.getBlob(`/contratos/${id}/instrucoes-gerais`),
  uploadAssinado: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiAuth.upload<Contrato>(`/contratos/${id}/upload-assinado`, form);
  },
  downloadAssinado: (id: number) => apiAuth.getBlob(`/contratos/${id}/download-assinado`),
  relatorioReceitaPdf: () => apiAuth.getBlob("/contratos/relatorio-receita/pdf"),
  indicadores: () => apiAuth.get<{
    receita_mensal_prevista: number;
    total_ativos: number;
    expirando_30_dias: number;
    sem_assinado: number;
    rascunhos: number;
  }>("/contratos/indicadores"),
};
