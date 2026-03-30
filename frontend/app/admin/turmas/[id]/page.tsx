"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { turmasService, type Turma, type HorarioTurma } from "@/services/admin/turmas";
import { professoresService, type Professor } from "@/services/admin/professores";
import { formatCpf } from "@/lib/masks";
import { getErrorMessage } from "@/lib/utils";
import { aulasService, type Aula } from "@/services/admin/aulas";
import { matriculasService, type Matricula } from "@/services/admin/matriculas";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";
import { authService } from "@/services/auth";
import Link from "next/link";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_OPTIONS = DIAS.map((d, i) => ({ value: String(i), label: d }));

export default function TurmaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const role = authService.getRole();
  const isAdmin = role === "admin" || role === "secretario";

  const [turma, setTurma] = useState<Turma | null>(null);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);

  // Editar turma
  const [editando, setEditando] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", livro: "", professor_id: "", status: "" });
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  // Horário form
  const [diaSemana, setDiaSemana] = useState("1");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");
  const [addingHorario, setAddingHorario] = useState(false);


  // Delete horario modal
  const [horarioParaDeletar, setDeleteHorario] = useState<HorarioTurma | null>(null);
  const [deletandoHorario, setDeletingHorario] = useState(false);
  const [aprovando, setAprovando] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [t, as, ms] = await Promise.all([
        turmasService.buscar(Number(id)),
        aulasService.listar({ turma_id: Number(id), page_size: 500 }),
        matriculasService.listar({ turma_id: Number(id) }),
      ]);
      setTurma(t);
      setAulas(as.items);
      setMatriculas(ms);
      if (isAdmin) {
        const profs = await professoresService.listar();
        setProfessores(profs);
      }
    } finally { setLoading(false); }
  }

  function abrirEdicao() {
    if (!turma) return;
    setEditForm({
      nome: turma.nome,
      livro: turma.livro ?? "",
      professor_id: String(turma.professor?.pessoa_id ?? ""),
      status: turma.status,
    });
    setEditando(true);
  }

  async function salvarEdicao() {
    setSalvandoEdit(true);
    try {
      await turmasService.atualizar(Number(id), {
        nome: editForm.nome,
        livro: editForm.livro || undefined,
        professor_id: Number(editForm.professor_id),
        status: editForm.status,
      });
      showToast("Turma atualizada!");
      setEditando(false);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao salvar."), "error");
    } finally { setSalvandoEdit(false); }
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
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao adicionar horário."), "error");
    } finally { setAddingHorario(false); }
  }

  async function handleRemoveHorario() {
    if (!horarioParaDeletar) return;
    setDeletingHorario(true);
    try {
      await turmasService.removerHorario(Number(id), horarioParaDeletar.id);
      showToast("Horário removido!");
      setDeleteHorario(null);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao remover horário."), "error");
    } finally { setDeletingHorario(false); }
  }

  async function handleAprovarAula(aulaId: number) {
    setAprovando(aulaId);
    try {
      const updated = await aulasService.aprovar(aulaId);
      setAulas((prev) => prev.map((a) => a.id === updated.id ? updated : a));
      showToast("Aula aprovada!");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao aprovar aula."), "error");
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{turma.nome}</h1>
          <p className="text-sm text-muted mt-1">
            {turma.livro ?? "Sem livro"} · {turma.professor?.pessoa.nome ?? "Sem professor"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={turma.status === "ativa" ? "success" : "neutral"}>{turma.status}</Badge>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={abrirEdicao}>Editar turma</Button>
          )}
        </div>
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
              render: (a) => <Link href={`/admin/aulas/${a.id}/presencas`} className="text-primary-600 hover:underline text-sm">Ver detalhes</Link>,
            },
          ]}
        />
      </section>

      {/* Matrículas */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Alunos matriculados ({matriculas.length})</h2>
          <Link href={`/admin/matriculas`} className="text-sm text-primary-500 hover:underline">Ver todas</Link>
        </div>
        <Table<Matricula>
          keyExtractor={(m) => m.id}
          data={matriculas}
          emptyMessage="Nenhuma matrícula nesta turma."
          columns={[
            { header: "Aluno", render: (m) => m.aluno?.pessoa.nome ?? "-" },
            { header: "CPF", render: (m) => formatCpf(m.aluno?.pessoa.cpf) },
            { header: "Início", render: (m) => m.data_inicio ? new Date(m.data_inicio + "T00:00:00").toLocaleDateString("pt-BR") : "-" },
            { header: "Fim", render: (m) => m.data_fim ? new Date(m.data_fim + "T00:00:00").toLocaleDateString("pt-BR") : "-" },
            {
              header: "Status",
              render: (m) => <Badge variant={matriculaVariant[m.status] ?? "neutral"}>{m.status}</Badge>,
            },
          ]}
        />
      </section>

      {horarioParaDeletar && (
        <Modal
          title="Remover horário"
          message={`Remover ${DIAS[horarioParaDeletar.dia_semana]} ${horarioParaDeletar.hora_inicio.slice(0,5)} – ${horarioParaDeletar.hora_fim.slice(0,5)}?`}
          confirmLabel="Remover"
          onConfirm={handleRemoveHorario}
          onClose={() => setDeleteHorario(null)}
          loading={deletandoHorario}
        />
      )}

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setEditando(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Editar turma</h2>
            <Field label="Nome">
              <Input value={editForm.nome} onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))} />
            </Field>
            <Field label="Livro">
              <Input value={editForm.livro} onChange={(e) => setEditForm((p) => ({ ...p, livro: e.target.value }))} placeholder="Opcional" />
            </Field>
            <Field label="Professor">
              <Select
                value={editForm.professor_id}
                onChange={(e) => setEditForm((p) => ({ ...p, professor_id: e.target.value }))}
                options={professores.map((p) => ({ value: String(p.pessoa_id), label: p.pessoa.nome }))}
              />
            </Field>
            <Field label="Status">
              <Select
                value={editForm.status}
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                options={[
                  { value: "ativa", label: "Ativa" },
                  { value: "encerrada", label: "Encerrada" },
                ]}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditando(false)}>Cancelar</Button>
              <Button onClick={salvarEdicao} disabled={salvandoEdit}>
                {salvandoEdit ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
