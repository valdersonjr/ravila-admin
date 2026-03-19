"use client";
import { useEffect, useState } from "react";
import { matriculasService, type Matricula } from "@/services/admin/matriculas";
import { turmasService, type Turma } from "@/services/admin/turmas";
import { alunosService, type Aluno } from "@/services/admin/alunos";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "ativa", label: "Ativa" },
  { value: "cancelada", label: "Cancelada" },
  { value: "concluida", label: "Concluída" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-foreground mb-1">{label}</label>{children}</div>;
}

export default function MatriculasPage() {
  const { showToast } = useToast();

  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterTurmaId, setFilterTurmaId] = useState<number | string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createAlunoId, setCreateAlunoId] = useState<number | string | null>(null);
  const [createTurmaId, setCreateTurmaId] = useState<number | string | null>(null);
  const [createDataInicio, setCreateDataInicio] = useState(new Date().toISOString().split("T")[0]);
  const [creating, setCreating] = useState(false);

  // Status update modal
  const [statusTarget, setStatusTarget] = useState<Matricula | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Parameters<typeof matriculasService.listar>[0] = {};
      if (filterTurmaId) params.turma_id = Number(filterTurmaId);
      if (filterStatus) params.status = filterStatus;
      setMatriculas(await matriculasService.listar(params));
    } finally { setLoading(false); }
  }

  useEffect(() => {
    Promise.all([turmasService.listar(), alunosService.listar({ status: "ativo" })]).then(([ts, as]) => {
      setTurmas(ts);
      setAlunos(as);
    });
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createAlunoId || !createTurmaId) { showToast("Selecione aluno e turma.", "error"); return; }
    setCreating(true);
    try {
      await matriculasService.criar({
        aluno_id: Number(createAlunoId),
        turma_id: Number(createTurmaId),
        data_inicio: createDataInicio,
      });
      showToast("Matrícula criada com sucesso!");
      setShowCreate(false);
      setCreateAlunoId(null);
      setCreateTurmaId(null);
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao criar matrícula.", "error");
    } finally { setCreating(false); }
  }

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!statusTarget || !newStatus) return;
    setUpdatingStatus(true);
    try {
      await matriculasService.atualizarStatus(statusTarget.id, {
        status: newStatus,
        data_fim: dataFim || undefined,
      });
      showToast("Status atualizado!");
      setStatusTarget(null);
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao atualizar status.", "error");
    } finally { setUpdatingStatus(false); }
  }

  const statusVariant: Record<string, "success" | "neutral" | "error"> = {
    ativa: "success",
    cancelada: "error",
    concluida: "neutral",
  };

  const turmaOptions = turmas.map((t) => ({ value: t.id, label: t.nome }));
  const alunoOptions = alunos.map((a) => ({ value: a.pessoa_id, label: a.pessoa.nome }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Matrículas</h1>
        <Button onClick={() => setShowCreate(true)}>+ Nova Matrícula</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-surface border border-border rounded-xl p-4">
        <div className="w-52">
          <label className="block text-xs text-muted mb-1">Turma</label>
          <Combobox options={turmaOptions} value={filterTurmaId} onChange={setFilterTurmaId} placeholder="Todas as turmas" />
        </div>
        <div className="w-40">
          <label className="block text-xs text-muted mb-1">Status</label>
          <Select options={STATUS_OPTIONS} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} />
        </div>
        <Button variant="outline" onClick={load}>Filtrar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<Matricula>
          keyExtractor={(m) => m.id}
          data={matriculas}
          columns={[
            { header: "Aluno", render: (m) => m.aluno?.pessoa.nome ?? "-" },
            { header: "Turma", render: (m) => m.turma?.nome ?? "-" },
            { header: "Início", render: (m) => new Date(m.data_inicio + "T00:00:00").toLocaleDateString("pt-BR") },
            { header: "Fim", render: (m) => m.data_fim ? new Date(m.data_fim + "T00:00:00").toLocaleDateString("pt-BR") : "-" },
            { header: "Status", render: (m) => <Badge variant={statusVariant[m.status] ?? "neutral"}>{m.status}</Badge> },
            {
              header: "Ações",
              render: (m) => (
                <Button size="sm" variant="outline" onClick={() => { setStatusTarget(m); setNewStatus(m.status); setDataFim(m.data_fim ?? ""); }}>
                  Alterar status
                </Button>
              ),
            },
          ]}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Nova Matrícula</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Aluno *">
                <Combobox options={alunoOptions} value={createAlunoId} onChange={setCreateAlunoId} placeholder="Selecionar aluno..." />
              </Field>
              <Field label="Turma *">
                <Combobox options={turmaOptions} value={createTurmaId} onChange={setCreateTurmaId} placeholder="Selecionar turma..." />
              </Field>
              <Field label="Data de início *">
                <Input type="date" value={createDataInicio} onChange={(e) => setCreateDataInicio(e.target.value)} required />
              </Field>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>Cancelar</Button>
                <Button type="submit" loading={creating}>Criar matrícula</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status update modal */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setStatusTarget(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Alterar Status — {statusTarget.aluno?.pessoa.nome}</h2>
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <Field label="Novo status">
                <Select
                  options={[
                    { value: "ativa", label: "Ativa" },
                    { value: "cancelada", label: "Cancelada" },
                    { value: "concluida", label: "Concluída" },
                  ]}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                />
              </Field>
              {(newStatus === "cancelada" || newStatus === "concluida") && (
                <Field label="Data de encerramento">
                  <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                </Field>
              )}
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setStatusTarget(null)} disabled={updatingStatus}>Cancelar</Button>
                <Button type="submit" loading={updatingStatus}>Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
