"use client";
import { useEffect, useState, useCallback } from "react";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCpf } from "@/lib/masks";
import Link from "next/link";

const PAGE_SIZE = 10;

export default function PessoasPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pessoasService.listar({ search: search || undefined, page, page_size: PAGE_SIZE });
      setPessoas(result.items);
      setTotal(result.total);
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Pessoas</h1>
        <Link href="/admin/pessoas/nova"><Button>+ Nova Pessoa</Button></Link>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Buscar por nome ou CPF..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">Buscar</Button>
        {search && (
          <Button type="button" variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); }}>
            Limpar
          </Button>
        )}
      </form>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <>
          <Table<Pessoa>
            keyExtractor={(p) => p.id}
            data={pessoas}
            columns={[
              { header: "Nome", render: (p) => p.nome },
              { header: "CPF", render: (p) => formatCpf(p.cpf) },
              { header: "Email", render: (p) => p.email ?? "-" },
              { header: "Telefone", render: (p) => p.telefone ?? "-" },
              { header: "Ações", render: (p) => <Link href={`/admin/pessoas/${p.id}/editar`} className="text-primary-600 hover:underline text-sm">Editar</Link> },
            ]}
          />

          <div className="flex items-center justify-between text-sm text-muted">
            <span>{total} pessoa{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                ← Anterior
              </Button>
              <span className="text-foreground">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                Próxima →
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
