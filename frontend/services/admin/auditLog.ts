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

export const auditLogService = {
  listar: (params?: { entity?: string; entity_id?: number; user_id?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.entity) qs.set("entity", params.entity);
    if (params?.entity_id != null) qs.set("entity_id", String(params.entity_id));
    if (params?.user_id != null) qs.set("user_id", String(params.user_id));
    if (params?.limit != null) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return apiAuth.get<AuditLog[]>(`/audit-log/${query ? `?${query}` : ""}`);
  },
};
