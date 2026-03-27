import { authService } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = authService.getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers, ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Erro ${res.status}`);
  }
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AulaPortal {
  id: number;
  data: string;           // "YYYY-MM-DD"
  hora_inicio: string;    // "HH:MM"
  hora_fim: string;       // "HH:MM"
  turma_nome: string | null;
  professor_nome: string;
  status: string;
  tipo: string;
}

export interface PresencaPortal {
  id: number;
  aula_id: number;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  turma_nome: string | null;
  presente: boolean;
}

export interface AulaListPortal {
  items: AulaPortal[];
  total: number;
  page: number;
  page_size: number;
}

export interface ResumoPortal {
  streak_semanas: number;
  proxima_aula: AulaPortal | null;
}

export interface MaterialPortal {
  id: number;
  titulo: string;
  descricao: string | null;
  tipo: string;       // "pdf" | "link" | "video" | "imagem"
  categoria: string;
  aula_id: number | null;
  tem_arquivo: boolean;
}

export interface ContratoPortal {
  id: number;
  status: string;
  tipo: string;
  curso: string;
  valor_mensalidade: number;
  desconto_percentual: number | null;
  desconto_valor: number | null;
  dia_vencimento: number;
  data_inicio: string;
  data_fim: string;
  tem_assinado: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const portalService = {
  resumo(): Promise<ResumoPortal> {
    return request("/portal/resumo");
  },

  aulas(params?: {
    data_inicio?: string;
    data_fim?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<AulaListPortal> {
    const qs = new URLSearchParams();
    if (params?.data_inicio) qs.set("data_inicio", params.data_inicio);
    if (params?.data_fim) qs.set("data_fim", params.data_fim);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const q = qs.toString();
    return request(`/portal/aulas${q ? `?${q}` : ""}`);
  },

  presencas(params?: { page?: number; page_size?: number }): Promise<PresencaPortal[]> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const q = qs.toString();
    return request(`/portal/presencas${q ? `?${q}` : ""}`);
  },

  contratos(): Promise<ContratoPortal[]> {
    return request("/portal/contratos");
  },

  downloadContrato(id: number): Promise<{ url: string }> {
    return request(`/portal/contratos/${id}/download`);
  },

  materiaisAula(aulaId: number): Promise<MaterialPortal[]> {
    return request(`/portal/aulas/${aulaId}/materiais`);
  },

  biblioteca(params?: { categoria?: string }): Promise<MaterialPortal[]> {
    const qs = new URLSearchParams();
    if (params?.categoria) qs.set("categoria", params.categoria);
    const q = qs.toString();
    return request(`/portal/biblioteca${q ? `?${q}` : ""}`);
  },

  downloadMaterial(id: number): Promise<{ url: string }> {
    return request(`/portal/materiais/${id}/download`);
  },
};
