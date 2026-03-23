"use client";
import { useEffect, useState, useCallback } from "react";
import { alunosService, type Aluno } from "@/services/admin/alunos";
import { niveisService, type Nivel } from "@/services/admin/niveis";
import { reposicoesService, type ReposicaoPendente } from "@/services/admin/reposicoes";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Tooltip } from "@/components/ui/Tooltip";
import { formatCpf } from "@/lib/masks";
import Link from "next/link";

const PAGE_SIZE = 10;

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [reposicoes, setReposicoes] = useState<ReposicaoPendente[]>([]);
  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [nivelId, setNivelId] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof alunosService.listar>[0] = { page, page_size: PAGE_SIZE };
      if (status) params.status = status;
      if (search) params.search = search;
      if (nivelId) params.nivel_id = Number(nivelId);
      const [result, r] = await Promise.all([alunosService.listar(params), reposicoesService.listar()]);
      setAlunos(result.items);
      setTotal(result.total);
      setReposicoes(r);
    } finally { setLoading(false); }
  }, [status, search, nivelId, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    niveisService.listar().then(setNiveis).catch(() => {});
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [status, search, nivelId]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
        <Link href="/admin/alunos/novo"><Button>+ Novo Aluno</Button></Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            className="w-56"
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
            { value: "ativo", label: "Ativo" },
            { value: "inativo", label: "Inativo" },
          ]}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-44"
        />
        <Select
          options={[
            { value: "", label: "Todos os níveis" },
            ...niveis.map((n) => ({ value: String(n.id), label: n.nome })),
          ]}
          value={nivelId}
          onChange={(e) => setNivelId(e.target.value)}
          className="w-52"
        />
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <>
          <Table<Aluno>
            keyExtractor={(a) => a.pessoa_id}
            data={alunos}
            columns={[
              { header: "Nome", render: (a) => a.pessoa.nome },
              { header: "CPF", render: (a) => formatCpf(a.pessoa.cpf ?? a.responsavel?.cpf) },
              { header: "Nível", render: (a) => a.nivel?.nome ?? "-" },
              { header: "Responsável", render: (a) => a.responsavel?.nome ?? "-" },
              {
                header: (
                  <span className="inline-flex items-center gap-1">
                    Reposições
                    <Tooltip content="Quantidade de reposições que o aluno precisa.">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-background text-[10px] font-bold leading-none">i</span>
                    </Tooltip>
                  </span>
                ),
                render: (a) => {
                  const count = reposicoes.filter((r) => r.aluno_id === a.pessoa_id).length;
                  return count > 0 ? <Badge variant="warning">{count} pendente{count > 1 ? "s" : ""}</Badge> : "-";
                },
              },
              { header: "Status", render: (a) => <Badge variant={a.status === "ativo" ? "success" : "neutral"}>{a.status}</Badge> },
              {
                header: "Ações",
                render: (a) => (
                  <Link href={`/admin/alunos/${a.pessoa_id}/editar`} className="text-primary-600 hover:underline text-sm">Editar</Link>
                ),
              },
            ]}
          />

          <div className="flex items-center justify-between text-sm text-muted">
            <span>{total} aluno{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</span>
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
