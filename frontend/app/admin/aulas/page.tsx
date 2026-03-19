"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { aulasService, type Aula } from "@/services/admin/aulas";
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

export default function AulasPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const isAdmin = authService.getRole() === "admin";

  const [aulas, setAulas] = useState<Aula[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);

  const [turmaId, setTurmaId] = useState<number | string | null>(null);
  const [professorId, setProfessorId] = useState<number | string | null>(null);
  const [status, setStatus] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [changingStatus, setChangingStatus] = useState<number | null>(null);

  // Modal substituir professor
  const [modalAula, setModalAula] = useState<Aula | null>(null);
  const [novoProfId, setNovoProfId] = useState<number | string | null>(null);
  const [savingProf, setSavingProf] = useState(false);


  async function load(overrideProfId?: number | string | null) {
    setLoading(true);
    try {
      const params: Parameters<typeof aulasService.listar>[0] = {};
      if (turmaId) params.turma_id = Number(turmaId);
      const pid = overrideProfId !== undefined ? overrideProfId : professorId;
      if (pid) params.professor_id = Number(pid);
      if (status) params.status = status;
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim) params.data_fim = dataFim;
      setAulas(await aulasService.listar(params));
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const pid = searchParams.get("professor_id");
    turmasService.listar().then(setTurmas);
    if (isAdmin) professoresService.listar().then(setProfessores);
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
    } catch (err: any) {
      showToast(err.message ?? "Erro ao atualizar status.", "error");
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

  async function handleSubstituir() {
    if (!modalAula || !novoProfId) return;
    setSavingProf(true);
    try {
      const updated = await aulasService.substituirProfessor(modalAula.id, Number(novoProfId));
      setAulas((prev) => prev.map((a) => a.id === updated.id ? updated : a));
      showToast("Professor atualizado!");
      closeModal();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao substituir professor.", "error");
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Aulas</h1>
        {isAdmin && <Link href="/admin/aulas/nova"><Button>+ Nova aula</Button></Link>}
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-surface border border-border rounded-xl p-4">
        {isAdmin && (
          <div className="w-52">
            <label className="block text-xs text-muted mb-1">Professor</label>
            <Combobox options={profOptions} value={professorId} onChange={setProfessorId} placeholder="Todos os professores" />
          </div>
        )}
        <div className="w-52">
          <label className="block text-xs text-muted mb-1">Turma</label>
          <Combobox options={turmaOptions} value={turmaId} onChange={setTurmaId} placeholder="Todas as turmas" />
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
        <Button variant="outline" onClick={() => load()}>Filtrar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<Aula>
          keyExtractor={(a) => a.id}
          data={aulas}
          columns={[
            { header: "Data", render: (a) => new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR") },
            { header: "Turma", render: (a) => a.turma?.nome ?? "-" },
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
            { header: "Tipo", render: (a) => <Badge variant={a.tipo === "regular" ? "primary" : "warning"}>{a.tipo === "substitutiva" ? "substitutiva" : a.tipo}</Badge> },
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
          ]}
        />
      )}

      {isAdmin && modalAula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border border-border p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Trocar professor</h2>
            <p className="text-sm text-muted">
              Aula de {new Date(modalAula.data + "T00:00:00").toLocaleDateString("pt-BR")} — {modalAula.turma?.nome ?? `turma ${modalAula.turma_id}`}
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
