"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { aulasService, type Aula } from "@/services/admin/aulas";
import { professoresService } from "@/services/admin/professores";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GerarSemanaModal } from "@/components/admin/GerarSemanaModal";
import Link from "next/link";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7..20

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

const statusVariant: Record<string, "success" | "warning" | "neutral" | "error"> = {
  realizada: "success",
  agendada: "warning",
  cancelada: "neutral",
  pendente_aprovacao: "error",
};

const statusLabel: Record<string, string> = {
  realizada: "Realizada",
  agendada: "Agendada",
  cancelada: "Cancelada",
  pendente_aprovacao: "Pendente",
};

export default function AgendaProfessorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [nomeProfessor, setNomeProfessor] = useState("");
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [exportando, setExportando] = useState(false);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  useEffect(() => {
    professoresService.buscar(Number(id)).then((p) => {
      setNomeProfessor(p.pessoa.nome);
    });
  }, [id]);

  useEffect(() => {
    setLoading(true);
    aulasService.listar({
      professor_id: Number(id),
      data_inicio: toISO(weekStart),
      data_fim: toISO(weekEnd),
      page_size: 500,
    }).then((res) => setAulas(res.items)).finally(() => setLoading(false));
  }, [id, weekStart]);

  function prevWeek() {
    setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  }

  function nextWeek() {
    setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  }

  function goToday() {
    setWeekStart(startOfWeek(new Date()));
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hoje = toISO(new Date());

  // Retorna aulas do dia que começam na hora exata (hora_inicio começa com "HH:")
  function aulasNaHora(iso: string, hour: number): Aula[] {
    const prefix = String(hour).padStart(2, "0") + ":";
    return aulas.filter((a) => a.data === iso && a.hora_inicio.startsWith(prefix));
  }

  const labelSemana = `${days[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${days[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;

  async function recarregarAulas() {
    const res = await aulasService.listar({ professor_id: Number(id), data_inicio: toISO(weekStart), data_fim: toISO(weekEnd), page_size: 500 });
    setAulas(res.items);
  }

  async function exportarPdf() {
    setExportando(true);
    try {
      const blob = await professoresService.exportarAgendaPdf(Number(id), toISO(weekStart));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agenda_${toISO(weekStart)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          {nomeProfessor && <p className="text-sm text-muted mt-1">{nomeProfessor}</p>}
        </div>
        <div className="flex gap-2">
          <GerarSemanaModal professorId={Number(id)} onGerado={recarregarAulas} />
          <Button variant="outline" size="sm" loading={exportando} onClick={exportarPdf}>
            Exportar PDF
          </Button>
          <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
        </div>
      </div>

      {/* Navegação */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={prevWeek}>‹ Anterior</Button>
        <Button variant="ghost" size="sm" onClick={goToday}>Hoje</Button>
        <Button variant="outline" size="sm" onClick={nextWeek}>Próxima ›</Button>
        <span className="text-sm text-muted ml-2">{labelSemana}</span>
      </div>

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-16 border-b border-r border-border bg-surface px-3 py-2 text-xs font-semibold text-muted text-left">Hora</th>
                {days.map((day, i) => {
                  const iso = toISO(day);
                  const isHoje = iso === hoje;
                  return (
                    <th
                      key={iso}
                      className={[
                        "border-b border-r last:border-r-0 border-border px-2 py-2 text-center",
                        isHoje ? "bg-primary-50 dark:bg-primary-950/30" : "bg-surface",
                      ].join(" ")}
                    >
                      <p className={["text-xs font-semibold uppercase tracking-wide", isHoje ? "text-primary-600" : "text-muted"].join(" ")}>{DIAS[i]}</p>
                      <p className={["text-base font-bold leading-tight", isHoje ? "text-primary-600" : "text-foreground"].join(" ")}>{day.getDate()}</p>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour} className="border-b border-border last:border-b-0">
                  <td className="border-r border-border bg-surface px-3 py-2 text-xs font-medium text-muted whitespace-nowrap align-top">
                    {String(hour).padStart(2, "0")}:00
                  </td>
                  {days.map((day) => {
                    const iso = toISO(day);
                    const isHoje = iso === hoje;
                    const aulasCell = aulasNaHora(iso, hour);
                    return (
                      <td
                        key={iso}
                        className={[
                          "border-r last:border-r-0 border-border px-1.5 py-1.5 align-top min-w-[110px]",
                          isHoje ? "bg-primary-50/40 dark:bg-primary-950/10" : "bg-background",
                        ].join(" ")}
                      >
                        <div className="flex flex-col gap-1">
                          {aulasCell.map((aula) => (
                            <Link
                              key={aula.id}
                              href={`/admin/aulas/${aula.id}/presencas`}
                              className="block rounded-lg px-2 py-1.5 bg-surface border border-border hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-colors"
                            >
                              <p className="text-xs font-semibold text-foreground truncate">{aula.turma?.nome ?? `Turma ${aula.turma_id}`}</p>
                              <p className="text-[11px] text-muted">{aula.hora_inicio.slice(0, 5)} – {aula.hora_fim.slice(0, 5)}</p>
                              <Badge variant={statusVariant[aula.status] ?? "neutral"}>
                                {statusLabel[aula.status] ?? aula.status}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
