import { apiAuth } from "../api";

export interface AuditLog {
  id: number;
  user_id: number;
  user_username: string;
  action: string;
  entity: string;
  entity_id: number;
  detalhes: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogPage {
  items: AuditLog[];
  total: number;
}

export const auditLogService = {
  listar: (params?: {
    entity?: string;
    entity_id?: number;
    user_id?: number;
    action?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.entity) qs.set("entity", params.entity);
    if (params?.entity_id != null) qs.set("entity_id", String(params.entity_id));
    if (params?.user_id != null) qs.set("user_id", String(params.user_id));
    if (params?.action) qs.set("action", params.action);
    if (params?.search) qs.set("search", params.search);
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    const query = qs.toString();
    return apiAuth.get<AuditLogPage>(`/audit-log/${query ? `?${query}` : ""}`);
  },
};
