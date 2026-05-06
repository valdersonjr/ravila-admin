"use client";
import { useEffect, useState } from "react";
import { auditLogService, type AuditLog } from "@/services/admin/auditLog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";

const PAGE_SIZE = 50;

const ENTITY_OPTIONS = [
  { value: "", label: "Todas as entidades" },
  { value: "aula", label: "Aula" },
  { value: "matricula", label: "Matrícula" },
  { value: "presenca", label: "Presença" },
];

const ACTION_OPTIONS = [
  { value: "", label: "Todas as ações" },
  { value: "CREATE", label: "Criação" },
  { value: "UPDATE", label: "Atualização" },
  { value: "DELETE", label: "Exclusão" },
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

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detalhesLog, setDetalhesLog] = useState<AuditLog | null>(null);

  const debouncedSearch = useDebounce(search, 450);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    auditLogService
      .listar({
        entity: entity || undefined,
        action: action || undefined,
        search: debouncedSearch || undefined,
        date_from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
        date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      .then((data) => {
        if (!cancelled) {
          setLogs(data.items);
          setTotal(data.total);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, entity, action, debouncedSearch, dateFrom, dateTo]);

  function onFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      setPage(0);
      setter(e.target.value);
    };
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Usuário</span>
          <Input
            placeholder="Buscar por usuário..."
            value={search}
            onChange={(e) => { setPage(0); setSearch(e.target.value); }}
            className="w-52"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Entidade</span>
          <Select options={ENTITY_OPTIONS} value={entity} onChange={onFilterChange(setEntity)} className="w-48" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Ação</span>
          <Select options={ACTION_OPTIONS} value={action} onChange={onFilterChange(setAction)} className="w-44" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">De</span>
          <input
            type="date"
            value={dateFrom}
            onChange={onFilterChange(setDateFrom)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Até</span>
          <input
            type="date"
            value={dateTo}
            onChange={onFilterChange(setDateTo)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
          />
        </div>
        {(entity || action || search || dateFrom || dateTo) && (
          <button
            onClick={() => { setPage(0); setEntity(""); setAction(""); setSearch(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-muted hover:text-foreground underline underline-offset-2 pb-2"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center">
          <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          <Table<AuditLog>
            keyExtractor={(l) => l.id}
            data={logs}
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
                    <button
                      onClick={() => setDetalhesLog(l)}
                      className="font-mono text-xs text-primary-500 hover:underline max-w-[180px] truncate block text-left"
                    >
                      {l.detalhes}
                    </button>
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

          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              {total === 0
                ? "Nenhum registro encontrado"
                : `${from}–${to} de ${total} registros`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <span className="text-xs tabular-nums">
                {page + 1} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}

      {detalhesLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setDetalhesLog(null)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border border-border p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Detalhes — {detalhesLog.entity} #{detalhesLog.entity_id}
              </h2>
              <button
                onClick={() => setDetalhesLog(null)}
                className="text-muted hover:text-foreground text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <pre className="text-xs font-mono bg-surface rounded-md p-4 overflow-auto max-h-80 text-foreground whitespace-pre-wrap break-all">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(detalhesLog.detalhes!), null, 2);
                } catch {
                  return detalhesLog.detalhes;
                }
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
