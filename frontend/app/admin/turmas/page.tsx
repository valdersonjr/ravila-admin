"use client";
import { useEffect, useState } from "react";
import { turmasService, type Turma } from "@/services/admin/turmas";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { authService } from "@/services/auth";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/utils";
import Link from "next/link";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PAGE_SIZE = 10;

export default function TurmasPage() {
  const { showToast } = useToast();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [turmaParaExcluir, setTurmaParaExcluir] = useState<Turma | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const role = authService.getRole();
  const isAdmin = role === "admin";
  const podeEditar = role === "admin" || role === "secretario" || role === "professor";
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function load(p = page) {
    setLoading(true);
    try {
      const result = await turmasService.listar({
        ...(status ? { status } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        page: p,
        page_size: PAGE_SIZE,
      });
      setTurmas(result.items);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page); }, [page]);

  function handleFiltrar() {
    setPage(1);
    load(1);
  }

  async function handleExcluir() {
    if (!turmaParaExcluir) return;
    setExcluindo(true);
    try {
      await turmasService.deletar(turmaParaExcluir.id);
      showToast("Turma excluída.");
      setTurmaParaExcluir(null);
      load(page);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao excluir turma."), "error");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Turmas</h1>
        {podeEditar && (
          <Link href="/admin/turmas/nova"><Button>+ Nova Turma</Button></Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-surface border border-border rounded-xl p-4">
        <div className="flex-1 min-w-40">
          <label className="block text-xs text-muted mb-1">Buscar</label>
          <Input
            placeholder="Nome da turma..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFiltrar()}
          />
        </div>
        <div className="w-44">
          <label className="block text-xs text-muted mb-1">Status</label>
          <Select
            options={[
              { value: "", label: "Todos os status" },
              { value: "ativa", label: "Ativa" },
              { value: "encerrada", label: "Encerrada" },
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={handleFiltrar}>Filtrar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <>
          <Table<Turma>
            keyExtractor={(t) => t.id}
            data={turmas}
            columns={[
              { header: "Nome", render: (t) => <Link href={`/admin/turmas/${t.id}`} className="text-primary-600 hover:underline font-medium">{t.nome}</Link> },
              { header: "Professor", render: (t) => t.professor?.pessoa.nome ?? "-" },
              {
                header: "Horários",
                render: (t) => t.horarios.length === 0 ? "-" : t.horarios.map(h => `${DIAS[h.dia_semana]} ${h.hora_inicio.slice(0,5)}`).join(", "),
              },
              {
                header: "Status",
                render: (t) => <Badge variant={t.status === "ativa" ? "success" : "neutral"}>{t.status}</Badge>,
              },
              {
                header: "Ações",
                render: (t) => (
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/turmas/${t.id}`} className="text-primary-600 hover:underline text-sm">Ver detalhes</Link>
                    {podeEditar && (
                      <button
                        onClick={() => setTurmaParaExcluir(t)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted">
              <span>{total} turma{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Anterior
                </Button>
                <span className="px-2">Página {page} de {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima →
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {turmaParaExcluir && (
        <Modal
          title="Excluir turma"
          message={`Excluir a turma "${turmaParaExcluir.nome}"? As matrículas vinculadas a ela também serão excluídas.`}
          confirmLabel="Excluir"
          onConfirm={handleExcluir}
          onClose={() => setTurmaParaExcluir(null)}
          loading={excluindo}
        />
      )}
    </div>
  );
}
