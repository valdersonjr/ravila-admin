"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { turmasService, type Turma, type HorarioTurma } from "@/services/admin/turmas";
import { aulasService, type Aula } from "@/services/admin/aulas";
import { matriculasService, type Matricula } from "@/services/admin/matriculas";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { authService } from "@/services/auth";
import Link from "next/link";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_OPTIONS = DIAS.map((d, i) => ({ value: String(i), label: d }));

export default function TurmaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const isAdmin = authService.getRole() === "admin";

  const [turma, setTurma] = useState<Turma | null>(null);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [loading, setLoading] = useState(true);

  // Horário form
  const [diaSemana, setDiaSemana] = useState("1");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");
  const [addingHorario, setAddingHorario] = useState(false);


  // Delete horario modal
  const [deleteHorario, setDeleteHorario] = useState<HorarioTurma | null>(null);
  const [deletingHorario, setDeletingHorario] = useState(false);
  const [aprovando, setAprovando] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [t, as, ms] = await Promise.all([
        turmasService.buscar(Number(id)),
        aulasService.listar({ turma_id: Number(id) }),
        matriculasService.listar({ turma_id: Number(id) }),
      ]);
      setTurma(t);
      setAulas(as);
      setMatriculas(ms);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function handleAddHorario(e: React.FormEvent) {
    e.preventDefault();
    setAddingHorario(true);
    try {
      await turmasService.adicionarHorario(Number(id), {
        dia_semana: Number(diaSemana),
        hora_inicio: horaInicio,
        hora_fim: horaFim,
      });
      showToast("Horário adicionado!");
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao adicionar horário.", "error");
    } finally { setAddingHorario(false); }
  }

  async function handleRemoveHorario() {
    if (!deleteHorario) return;
    setDeletingHorario(true);
    try {
      await turmasService.removerHorario(Number(id), deleteHorario.id);
      showToast("Horário removido!");
      setDeleteHorario(null);
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao remover horário.", "error");
    } finally { setDeletingHorario(false); }
  }

  async function handleAprovarAula(aulaId: number) {
    setAprovando(aulaId);
    try {
      const updated = await aulasService.aprovar(aulaId);
      setAulas((prev) => prev.map((a) => a.id === updated.id ? updated : a));
      showToast("Aula aprovada!");
    } catch (err: any) {
      showToast(err.message ?? "Erro ao aprovar aula.", "error");
    } finally { setAprovando(null); }
  }


  const statusVariant: Record<string, "success" | "warning" | "neutral"> = {
    realizada: "success",
    agendada: "warning",
    cancelada: "neutral",
  };

  const matriculaVariant: Record<string, "success" | "neutral" | "error"> = {
    ativa: "success",
    cancelada: "error",
    concluida: "neutral",
  };

  if (loading) {
    return <div className="flex justify-center h-40 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }

  if (!turma) return <p className="text-muted">Turma não encontrada.</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{turma.nome}</h1>
          <p className="text-sm text-muted mt-1">
            {turma.nivel?.nome ?? "Sem nível"} · {turma.professor?.pessoa.nome ?? "Sem professor"}
          </p>
        </div>
        <Badge variant={turma.status === "ativa" ? "success" : "neutral"}>{turma.status}</Badge>
      </div>

      {/* Horários */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Horários</h2>
        <div className="flex flex-wrap gap-2">
          {turma.horarios.length === 0 && <p className="text-sm text-muted">Nenhum horário cadastrado.</p>}
          {turma.horarios.map((h) => (
            <div key={h.id} className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{DIAS[h.dia_semana]}</span>
              <span className="text-muted">{h.hora_inicio.slice(0,5)} – {h.hora_fim.slice(0,5)}</span>
              {isAdmin && <button onClick={() => setDeleteHorario(h)} className="text-rose-500 hover:text-rose-700 text-xs ml-1">✕</button>}
            </div>
          ))}
        </div>
        {isAdmin && (
          <form onSubmit={handleAddHorario} className="flex flex-wrap gap-3 items-end bg-surface border border-border rounded-xl p-4">
            <div>
              <label className="block text-xs text-muted mb-1">Dia</label>
              <Select options={DIAS_OPTIONS} value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)} className="w-36" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Início</label>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="w-32" required />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Fim</label>
              <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className="w-32" required />
            </div>
            <Button type="submit" loading={addingHorario} size="sm">+ Adicionar horário</Button>
          </form>
        )}
      </section>

      {/* Aulas */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Aulas ({aulas.length})</h2>
        <Table<Aula>
          keyExtractor={(a) => a.id}
          data={aulas}
          emptyMessage="Nenhuma aula gerada ainda."
          columns={[
            { header: "Data", render: (a) => new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR") },
            { header: "Horário", render: (a) => `${a.hora_inicio.slice(0,5)} – ${a.hora_fim.slice(0,5)}` },
            { header: "Professor", render: (a) => a.professor_nome_snapshot },
            { header: "Tipo", render: (a) => <Badge variant={a.tipo === "regular" ? "primary" : "warning"}>{a.tipo}</Badge> },
            {
              header: "Status",
              render: (a) => (
                <div className="flex items-center gap-2">
                  <Badge variant={a.status === "pendente_aprovacao" ? "warning" : (statusVariant[a.status] ?? "neutral")}>
                    {a.status === "pendente_aprovacao" ? "pendente" : a.status}
                  </Badge>
                  {isAdmin && a.status === "pendente_aprovacao" && (
                    <button
                      onClick={() => handleAprovarAula(a.id)}
                      disabled={aprovando === a.id}
                      className="text-xs text-primary-600 hover:underline disabled:opacity-50"
                    >
                      Aprovar
                    </button>
                  )}
                </div>
              ),
            },
            {
              header: "Presenças",
              render: (a) => <Link href={`/admin/aulas/${a.id}/presencas`} className="text-primary-600 hover:underline text-sm">Registrar</Link>,
            },
          ]}
        />
      </section>

      {/* Matrículas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Matrículas ({matriculas.length})</h2>
          <Link href={`/admin/matriculas`} className="text-sm text-primary-500 hover:underline">Ver todas</Link>
        </div>
        <Table<Matricula>
          keyExtractor={(m) => m.id}
          data={matriculas}
          emptyMessage="Nenhuma matrícula nesta turma."
          columns={[
            { header: "Aluno", render: (m) => m.aluno?.pessoa.nome ?? "-" },
            { header: "CPF", render: (m) => m.aluno?.pessoa.cpf ?? "-" },
            { header: "Início", render: (m) => new Date(m.data_inicio + "T00:00:00").toLocaleDateString("pt-BR") },
            { header: "Fim", render: (m) => m.data_fim ? new Date(m.data_fim + "T00:00:00").toLocaleDateString("pt-BR") : "-" },
            {
              header: "Status",
              render: (m) => <Badge variant={matriculaVariant[m.status] ?? "neutral"}>{m.status}</Badge>,
            },
          ]}
        />
      </section>

      {deleteHorario && (
        <Modal
          title="Remover horário"
          message={`Remover ${DIAS[deleteHorario.dia_semana]} ${deleteHorario.hora_inicio.slice(0,5)} – ${deleteHorario.hora_fim.slice(0,5)}?`}
          confirmLabel="Remover"
          onConfirm={handleRemoveHorario}
          onClose={() => setDeleteHorario(null)}
          loading={deletingHorario}
        />
      )}
    </div>
  );
}
