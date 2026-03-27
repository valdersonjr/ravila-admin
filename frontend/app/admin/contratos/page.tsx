"use client";
import { useEffect, useState, useCallback } from "react";
import { contratosService, type Contrato } from "@/services/admin/contratos";
import { authService } from "@/services/auth";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

const PAGE_SIZE = 10;

const statusVariant: Record<string, "success" | "warning" | "neutral"> = {
  ativo: "success",
  rascunho: "warning",
  encerrado: "neutral",
  rescindido: "neutral",
};

function formatBRL(valor: string | number) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ContratosPage() {
  const isAdmin = authService.getRole() === "admin";
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await contratosService.listar({
        page,
        page_size: PAGE_SIZE,
        ...(status && { status }),
        ...(search && { search }),
      });
      setContratos(result.items);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Link href="/admin/contratos/novo?tipo=formal"><Button variant="outline">+ Contrato Formal</Button></Link>
            <Link href="/admin/contratos/novo?tipo=informal"><Button>+ Contrato Informal</Button></Link>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome do aluno..."
            className="w-60"
          />
          <Button type="submit" variant="outline" size="sm">Buscar</Button>
          {search && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(""); setSearchInput(""); }}>
              Limpar
            </Button>
          )}
        </form>
        <Select
          options={[
            { value: "", label: "Todos os status" },
            { value: "rascunho", label: "Rascunho" },
            { value: "ativo", label: "Ativo" },
            { value: "encerrado", label: "Encerrado" },
            { value: "rescindido", label: "Rescindido" },
          ]}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-48"
        />
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center">
          <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          <Table<Contrato>
            keyExtractor={(c) => c.id}
            data={contratos}
            columns={[
              {
                header: "Aluno(s)",
                render: (c) => (
                  <span>
                    {c.alunos.map((a) => a.pessoa.nome).join(", ")}
                  </span>
                ),
              },
              { header: "Contratante", render: (c) => c.contratante.nome },
              { header: "Modalidade", render: (c) => c.curso },
              ...(isAdmin ? [{ header: "Mensalidade", render: (c: Contrato) => formatBRL(c.valor_mensalidade) }] : []),
              {
                header: "Vigência",
                render: (c) => {
                  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
                  return `${fmt(c.data_inicio)} – ${fmt(c.data_fim)}`;
                },
              },
              { header: "Tipo", render: (c) => <Badge variant={c.tipo === "formal" ? "neutral" : "warning"}>{c.tipo}</Badge> },
              { header: "Status", render: (c) => <Badge variant={statusVariant[c.status] ?? "neutral"}>{c.status}</Badge> },
              ...(isAdmin ? [{
                header: "Ações",
                render: (c: Contrato) => (
                  <Link href={`/admin/contratos/${c.id}`} className="text-primary-600 hover:underline text-sm">
                    Ver
                  </Link>
                ),
              }] : []),
            ]}
          />
          <div className="flex items-center justify-between text-sm text-muted">
            <span>{total} contrato{total !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>← Anterior</Button>
              <span className="text-foreground">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>Próxima →</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
