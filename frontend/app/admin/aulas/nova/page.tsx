"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { aulasService, type Aula } from "@/services/admin/aulas";
import { getErrorMessage } from "@/lib/utils";
import { turmasService, type Turma, type HorarioTurma } from "@/services/admin/turmas";
import { professoresService, type Professor } from "@/services/admin/professores";
import { authService } from "@/services/auth";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { Field } from "@/components/ui/Field";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface Slot { data: string; hora_inicio: string; hora_fim: string; label: string; }

function calcularProximasDatasTurma(horarios: HorarioTurma[], aulasProf: Aula[], n = 6): Slot[] {
  const ocupados = new Set(aulasProf.filter((a) => ["agendada", "pendente_aprovacao"].includes(a.status)).map((a) => a.data));
  const slots: Slot[] = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (let offset = 1; offset <= 84 && slots.length < n; offset++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + offset);
    const diaSemana = d.getDay();
    const dataStr = d.toISOString().split("T")[0];

    for (const h of horarios) {
      if (h.dia_semana === diaSemana && !ocupados.has(dataStr)) {
        const label = `${DIAS[diaSemana]}, ${d.toLocaleDateString("pt-BR")} · ${h.hora_inicio.slice(0, 5)} – ${h.hora_fim.slice(0, 5)}`;
        slots.push({ data: dataStr, hora_inicio: h.hora_inicio, hora_fim: h.hora_fim, label });
      }
    }
  }
  return slots;
}

export default function NovaAulaPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const isAdmin = authService.getRole() === "admin";
  const isProfessor = authService.getRole() === "professor";
  const pessoaId = authService.getPessoaId();

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmaId, setTurmaId] = useState<number | string | null>(null);
  const [professorId, setProfessorId] = useState<number | string | null>(null);
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");
  const [tipo, setTipo] = useState<"regular" | "substitutiva">("regular");
  const [loading, setLoading] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotSelecionado, setSlotSelecionado] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (isProfessor && pessoaId) {
      setProfessorId(pessoaId);
      turmasService.listar({ professor_id: pessoaId, page_size: 500 }).then((r) => setTurmas(r.items));
    } else {
      Promise.all([turmasService.listar({ page_size: 500 }), professoresService.listar()]).then(([ts, ps]) => {
        setTurmas(ts.items);
        setProfessores(ps.filter((p) => p.ativo));
      });
    }
  }, []);

  async function atualizarSlots(tId: number | string | null, pId: number | string | null) {
    const turma = turmas.find((t) => t.id === Number(tId));
    if (!turma || !turma.horarios.length || !pId) { setSlots([]); return; }
    setLoadingSlots(true);
    try {
      const aulasProf = await aulasService.listar({ professor_id: Number(pId), page_size: 500 });
      setSlots(calcularProximasDatasTurma(turma.horarios, aulasProf.items));
    } finally { setLoadingSlots(false); }
    setSlotSelecionado("");
  }

  function handleTurmaChange(id: number | string | null) {
    setTurmaId(id);
    setSlotSelecionado("");
    const turma = turmas.find((t) => t.id === Number(id));
    const profId = turma?.professor ? turma.professor.pessoa_id : professorId;
    if (turma?.professor) setProfessorId(turma.professor.pessoa_id);
    atualizarSlots(id, profId);
  }

  function handleProfessorChange(id: number | string | null) {
    setProfessorId(id);
    setSlotSelecionado("");
    atualizarSlots(turmaId, id);
  }

  function handleSlotChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setSlotSelecionado(val);
    if (!val) return;
    const slot = slots.find((s) => s.data === val);
    if (slot) {
      setData(slot.data);
      setHoraInicio(slot.hora_inicio.slice(0, 5));
      setHoraFim(slot.hora_fim.slice(0, 5));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!turmaId || !professorId) { showToast("Selecione turma e professor.", "error"); return; }
    setLoading(true);
    try {
      await aulasService.criar({
        turma_id: Number(turmaId),
        professor_id: Number(professorId),
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        tipo,
      });
      showToast("Aula criada!");
      router.push("/admin/aulas");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar aula."), "error");
    } finally { setLoading(false); }
  }

  const turmaOptions = turmas.map((t) => ({ value: t.id, label: t.nome }));
  const profOptions = professores.map((p) => ({ value: p.pessoa_id, label: p.pessoa.nome }));

  const turmaSelecionada = turmas.find((t) => t.id === Number(turmaId));
  const temHorarios = (turmaSelecionada?.horarios.length ?? 0) > 0;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Nova Aula</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Turma *">
          <Combobox options={turmaOptions} value={turmaId} onChange={handleTurmaChange} placeholder="Selecionar turma..." />
        </Field>
        {!isProfessor && (
          <Field label="Professor *">
            <Combobox options={profOptions} value={professorId} onChange={handleProfessorChange} placeholder="Selecionar professor..." />
          </Field>
        )}

        {temHorarios && professorId && (
          <Field label="Próximas datas disponíveis">
            {loadingSlots ? (
              <p className="text-sm text-muted">Calculando...</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma data disponível nas próximas 12 semanas.</p>
            ) : (
              <Select
                options={[{ value: "", label: "Selecionar data sugerida..." }, ...slots.map((s) => ({ value: s.data, label: s.label }))]}
                value={slotSelecionado}
                onChange={handleSlotChange}
              />
            )}
          </Field>
        )}

        <Field label="Data *">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </Field>
        <div className="flex gap-3">
          <Field label="Início *">
            <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
          </Field>
          <Field label="Fim *">
            <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} required />
          </Field>
        </div>
        <Field label="Tipo">
          <div className="flex gap-2">
            {(["regular", "substitutiva"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={["px-3 py-2 rounded-md text-sm border transition-colors", tipo === t ? "bg-primary-600 text-on-primary border-primary-600" : "border-border text-foreground hover:bg-surface"].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>Criar aula</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
