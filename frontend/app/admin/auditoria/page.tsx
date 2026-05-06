"use client";
import { useEffect, useState } from "react";
import { auditLogService, type AuditLog } from "@/services/admin/auditLog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";

const ENTITY_OPTIONS = [
  { value: "", label: "Todas as entidades" },
  { value: "aula", label: "Aula" },
  { value: "matricula", label: "Matrícula" },
  { value: "presenca", label: "Presença" },
];

const ACTION_VARIANT: Record<string, "primary" | "warning" | "neutral" | "success"> = {
  CREATE: "success",
  UPDATE: "warning",
  DELETE: "neutral",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function parseUserAgent(ua: string | null) {
  if (!ua) return "—";
  if (ua.includes("iPhone") || ua.includes("Android")) return "Mobile";
  if (ua.includes("Macintosh") || ua.includes("Mac OS")) return "Mac";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Linux")) return "Linux";
  return ua.slice(0, 40);
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await auditLogService.listar({ entity: entity || undefined, limit: 200 });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [entity]);

  const filtered = search
    ? logs.filter((l) =>
        l.user_username.toLowerCase().includes(search.toLowerCase()) ||
        l.entity.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        (l.ip_address ?? "").includes(search)
      )
    : logs;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por usuário, ação, IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          options={ENTITY_OPTIONS}
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="w-52"
        />
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center">
          <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <Table<AuditLog>
          keyExtractor={(l) => l.id}
          data={filtered}
          columns={[
            {
              header: "Data",
              render: (l) => (
                <span className="text-sm text-muted whitespace-nowrap">{formatDate(l.created_at)}</span>
              ),
            },
            {
              header: "Usuário",
              render: (l) => <span className="font-mono text-sm">{l.user_username}</span>,
            },
            {
              header: "Ação",
              render: (l) => (
                <Badge variant={ACTION_VARIANT[l.action] ?? "neutral"}>{l.action}</Badge>
              ),
            },
            {
              header: "Entidade",
              render: (l) => (
                <span className="text-sm">
                  {l.entity} <span className="text-muted">#{l.entity_id}</span>
                </span>
              ),
            },
            {
              header: "Detalhes",
              render: (l) =>
                l.detalhes ? (
                  <span className="font-mono text-xs text-muted">{l.detalhes}</span>
                ) : (
                  <span className="text-muted text-xs">—</span>
                ),
            },
            {
              header: "IP",
              render: (l) => (
                <span className="font-mono text-xs">{l.ip_address ?? "—"}</span>
              ),
            },
            {
              header: "Dispositivo",
              render: (l) => (
                <span className="text-xs text-muted">{parseUserAgent(l.user_agent)}</span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
