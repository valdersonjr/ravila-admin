"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { aulasService, type Aula } from "@/services/admin/aulas";
import { getErrorMessage } from "@/lib/utils";
import { turmasService, type Turma } from "@/services/admin/turmas";
import { professoresService, type Professor } from "@/services/admin/professores";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { useToast } from "@/context/ToastContext";
import { authService } from "@/services/auth";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "agendada", label: "Agendada" },
  { value: "realizada", label: "Realizada" },
  { value: "cancelada", label: "Cancelada" },
];

const STATUS_NEXT: Record<string, string> = {
  agendada: "realizada",
  realizada: "cancelada",
  cancelada: "agendada",
};

const PAGE_SIZE = 10;

export default function AulasPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const role = authService.getRole();
  const isAdmin = role === "admin" || role === "secretario";
  const isProfessor = role === "professor";
  const pessoaId = authService.getPessoaId();

  const [aulas, setAulas] = useState<Aula[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [loadingProfessores, setLoadingProfessores] = useState(true);

  const [turmaId, setTurmaId] = useState<number | string | null>(null);
  const [professorId, setProfessorId] = useState<number | string | null>(null);
  const [status, setStatus] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [changingStatus, setChangingStatus] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Modal substituir professor
  const [modalAula, setModalAula] = useState<Aula | null>(null);
  const [novoProfId, setNovoProfId] = useState<number | string | null>(null);
  const [savingProf, setSavingProf] = useState(false);


  async function load(overrideProfId?: number | string | null, overridePage?: number) {
    setLoading(true);
    try {
      const params: Parameters<typeof aulasService.listar>[0] = { page: overridePage ?? page, page_size: PAGE_SIZE };
      if (turmaId) params.turma_id = Number(turmaId);
      const pid = overrideProfId !== undefined ? overrideProfId : professorId;
      if (pid) params.professor_id = Number(pid);
      if (status) params.status = status;
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim) params.data_fim = dataFim;
      const result = await aulasService.listar(params);
      setAulas(result.items);
      setTotal(result.total);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const pid = searchParams.get("professor_id");
    turmasService.listar({ page_size: 500 }).then((r) => setTurmas(r.items)).finally(() => setLoadingTurmas(false));
    if (isAdmin) {
      professoresService.listar().then(setProfessores).finally(() => setLoadingProfessores(false));
    } else {
      setLoadingProfessores(false);
    }
    if (pid) {
      setProfessorId(Number(pid));
      load(Number(pid));
    } else {
      load();
    }
  }, []);

  async function handleStatusChange(aula: Aula) {
    const next = STATUS_NEXT[aula.status];
    if (!next) return;
    setChangingStatus(aula.id);
    try {
      const updated = await aulasService.atualizarStatus(aula.id, next);
      setAulas((prev) => prev.map((a) => a.id === updated.id ? updated : a));
      showToast(`Status atualizado para "${next}".`);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar status."), "error");
    } finally { setChangingStatus(null); }
  }

  function openModal(aula: Aula) {
    setModalAula(aula);
    setNovoProfId(aula.professor_id);
  }

  function closeModal() {
    setModalAula(null);
    setNovoProfId(null);
  }

  async function handleDeletar(aula: Aula) {
    if (!confirm(`Excluir aula de ${new Date(aula.data + "T00:00:00").toLocaleDateString("pt-BR")}? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(aula.id);
    try {
      await aulasService.deletar(aula.id);
      setAulas((prev) => prev.filter((a) => a.id !== aula.id));
      showToast("Aula excluída.");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao excluir aula."), "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubstituir() {
    if (!modalAula || !novoProfId) return;
    setSavingProf(true);
    try {
      const updated = await aulasService.substituirProfessor(modalAula.id, Number(novoProfId));
      setAulas((prev) => prev.map((a) => a.id === updated.id ? updated : a));
      showToast("Professor atualizado!");
      closeModal();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao substituir professor."), "error");
    } finally { setSavingProf(false); }
  }

  const statusVariant: Record<string, "success" | "warning" | "neutral"> = {
    realizada: "success",
    agendada: "warning",
    cancelada: "neutral",
  };

  const turmaOptions = turmas.map((t) => ({ value: t.id, label: t.nome }));
  const profOptions = professores.map((p) => ({ value: p.pessoa_id, label: p.pessoa.nome }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Aulas</h1>
        <div className="flex gap-2">
          <Link href="/admin/aulas/nova"><Button variant="outline">+ Aula de turma</Button></Link>
          {isAdmin && <Link href="/admin/aulas/avulsa/nova"><Button>+ Aula experimental</Button></Link>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-surface border border-border rounded-xl p-4">
        {isAdmin && (
          <div className="w-52">
            <label className="block text-xs text-muted mb-1">Professor</label>
            <Combobox options={profOptions} value={professorId} onChange={setProfessorId} placeholder="Todos os professores" loading={loadingProfessores} />
          </div>
        )}
        <div className="w-52">
          <label className="block text-xs text-muted mb-1">Turma</label>
          <Combobox options={turmaOptions} value={turmaId} onChange={setTurmaId} placeholder="Todas as turmas" loading={loadingTurmas} />
        </div>
        <div className="w-40">
          <label className="block text-xs text-muted mb-1">Status</label>
          <Select options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">De</label>
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Até</label>
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => { setPage(1); load(undefined, 1); }}>Filtrar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <>
        <Table<Aula>
          keyExtractor={(a) => a.id}
          data={aulas}
          columns={[
            { header: "Data", render: (a) => new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR") },
            {
              header: "Turma / Aluno",
              render: (a) => a.turma
                ? a.turma.nome
                : <span className="inline-flex items-center gap-1"><Badge variant="warning">experimental</Badge>{a.aluno_nome_snapshot ?? "-"}</span>,
            },
            {
              header: "Professor",
              render: (a) => {
                const substituto = a.turma != null && a.professor_id !== a.turma.professor_id;
                const badge = substituto && (
                  <span className="inline-flex items-center rounded-full bg-warning-100 text-warning-600 text-[10px] font-semibold px-1.5 py-0.5 leading-none">
                    substituto
                  </span>
                );
                if (!isAdmin) {
                  return <span className="text-sm flex items-center gap-1.5">{a.professor_nome_snapshot}{badge}</span>;
                }
                return (
                  <button
                    onClick={() => openModal(a)}
                    className="text-left hover:underline text-primary-600 text-sm flex items-center gap-1.5"
                    title="Clique para trocar o professor"
                  >
                    {a.professor_nome_snapshot}{badge}
                  </button>
                );
              },
            },
            { header: "Horário", render: (a) => `${a.hora_inicio.slice(0,5)} – ${a.hora_fim.slice(0,5)}` },
            { header: "Tipo", render: (a) => <Badge variant={a.tipo === "regular" ? "primary" : "warning"}>{a.tipo}</Badge> },
            {
              header: "Status",
              render: (a) => (
                <button
                  onClick={() => handleStatusChange(a)}
                  disabled={changingStatus === a.id}
                  title="Clique para avançar o status"
                  className="cursor-pointer disabled:opacity-50"
                >
                  <Badge variant={statusVariant[a.status] ?? "neutral"}>{a.status}</Badge>
                </button>
              ),
            },
            {
              header: "Presenças",
              render: (a) => <Link href={`/admin/aulas/${a.id}/presencas`} className="text-primary-600 hover:underline text-sm">Ver detalhes</Link>,
            },
            ...((isAdmin || isProfessor) ? [{
              header: "",
              render: (a: Aula) => {
                const podeExcluir = isAdmin || (isProfessor && a.professor_id === pessoaId);
                const isFutura = a.data >= new Date().toISOString().split("T")[0];
                if (!podeExcluir || a.status !== "agendada" || !isFutura) return null;
                return (
                  <button
                    onClick={() => handleDeletar(a)}
                    disabled={deletingId === a.id}
                    className="text-xs text-red-600 hover:text-red-700 disabled:opacity-40"
                  >
                    {deletingId === a.id ? "..." : "Excluir"}
                  </button>
                );
              },
            }] : []),
          ]}
        />

        <div className="flex items-center justify-between text-sm text-muted">
          <span>{total} aula{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { const p = page - 1; setPage(p); load(undefined, p); }} disabled={page <= 1}>
              ← Anterior
            </Button>
            <span className="text-foreground">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => { const p = page + 1; setPage(p); load(undefined, p); }} disabled={page >= totalPages}>
              Próxima →
            </Button>
          </div>
        </div>
        </>
      )}

      {isAdmin && modalAula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border border-border p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Trocar professor</h2>
            <p className="text-sm text-muted">
              Aula de {new Date(modalAula.data + "T00:00:00").toLocaleDateString("pt-BR")} — {modalAula.turma?.nome ?? `experimental · ${modalAula.aluno_nome_snapshot}`}
            </p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Professor</label>
              <Combobox options={profOptions} value={novoProfId} onChange={setNovoProfId} placeholder="Selecionar professor..." />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={closeModal} disabled={savingProf}>Cancelar</Button>
              <Button onClick={handleSubstituir} loading={savingProf} disabled={!novoProfId}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
