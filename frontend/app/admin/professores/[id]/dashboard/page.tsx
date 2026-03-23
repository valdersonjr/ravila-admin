"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { professoresService, type ProfessorDashboard } from "@/services/admin/professores";
import type { GerarSemanaRelatorio } from "@/services/admin/turmas";
import { alunosService, type Aluno } from "@/services/admin/alunos";
import { formatCpf } from "@/lib/masks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Metrica = "realizadas" | "canceladas" | "presenca";

const METRICAS: { key: Metrica; label: string }[] = [
  { key: "realizadas", label: "Aulas realizadas" },
  { key: "canceladas", label: "Aulas canceladas" },
  { key: "presenca",   label: "Presença média" },
];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">{children}</h2>;
}

function HistoricoChart({ data }: { data: ProfessorDashboard["historico_mensal"] }) {
  const [metrica, setMetrica] = useState<Metrica>("realizadas");

  const chartData = data.map((m) => ({
    mes: m.mes,
    realizadas: m.realizadas,
    canceladas: m.canceladas,
    presenca: m.presenca_media != null ? parseFloat((m.presenca_media * 100).toFixed(1)) : null,
  }));

  const config: Record<Metrica, { dataKey: string; color: string; unit: string; label: string }> = {
    realizadas: { dataKey: "realizadas", color: "#7c3aed", unit: " aulas", label: "Aulas realizadas" },
    canceladas:  { dataKey: "canceladas",  color: "#f59e0b", unit: " aulas", label: "Aulas canceladas" },
    presenca:    { dataKey: "presenca",    color: "#10b981", unit: "%",      label: "Presença média" },
  };

  const { dataKey, color, unit, label } = config[metrica];

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionTitle>Histórico mensal</SectionTitle>
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {METRICAS.map(({ key, label: l }) => (
            <button
              key={key}
              onClick={() => setMetrica(key)}
              className={`px-3 py-1.5 transition-colors ${
                metrica === key
                  ? "bg-primary-600 text-white font-medium"
                  : "text-muted hover:bg-primary-50/40"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">Sem dados suficientes.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--color-muted, #6b7280)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted, #6b7280)" }} axisLine={false} tickLine={false} unit={unit} />
            <Tooltip
              formatter={(v) => [`${v ?? ""}${unit}`, label]}
              contentStyle={{
                background: "var(--color-surface, #fff)",
                border: "1px solid var(--color-border, #e5e7eb)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

type ModalState = "idle" | "checking" | "report" | "generating" | "done";

export default function ProfessorDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ProfessorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>("idle");
  const [relatorio, setRelatorio] = useState<GerarSemanaRelatorio | null>(null);
  const [aniversarios, setAniversarios] = useState<Aluno[]>([]);

  useEffect(() => {
    Promise.all([
      professoresService.dashboard(Number(id)),
      alunosService.aniversarios(),
    ]).then(([dash, aniv]) => {
      setData(dash);
      setAniversarios(aniv);
    }).finally(() => setLoading(false));
  }, [id]);

  const semanaLabel = relatorio
    ? `${new Date(relatorio.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")} – ${new Date(relatorio.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}`
    : "";

  async function handleAbrirModal() {
    setModalState("checking");
    setRelatorio(null);
    const rel = await professoresService.gerarSemana(Number(id), true);
    setRelatorio(rel);
    setModalState("report");
  }

  async function handleConfirmar() {
    setModalState("generating");
    const rel = await professoresService.gerarSemana(Number(id), false);
    setRelatorio(rel);
    setModalState("done");
  }

  function handleFecharModal() {
    setModalState("idle");
    setRelatorio(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center h-40 items-center">
        <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-muted">Professor não encontrado.</p>;

  const pct = (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : "—";
  const mesAtual = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{data.nome}</h1>
            <Badge variant={data.ativo ? "success" : "neutral"}>{data.ativo ? "Ativo" : "Inativo"}</Badge>
          </div>
          <p className="text-sm text-muted">CPF: {formatCpf(data.cpf)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleAbrirModal}>Gerar semana</Button>
          <Link href={`/admin/aulas?professor_id=${data.professor_id}`}>
            <Button variant="outline">Ver aulas</Button>
          </Link>
          <Link href={`/admin/professores/${data.professor_id}/editar`}>
            <Button variant="outline">Editar</Button>
          </Link>
          <Button variant="ghost" onClick={() => router.back()}>Voltar</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <SectionTitle>Desempenho — {mesAtual}</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="Aulas dadas"
            value={String(data.aulas.mes_atual.realizadas)}
            sub={`${data.aulas.mes_atual.agendadas} ainda agendadas`}
          />
          <StatCard
            label="Presença média"
            value={pct(data.aulas.mes_atual.presenca_media)}
            sub="dos alunos nas aulas do mês"
          />
          <StatCard
            label="Aulas canceladas"
            value={String(data.aulas.mes_atual.canceladas)}
            sub={
              data.aulas.mes_atual.realizadas + data.aulas.mes_atual.canceladas > 0
                ? `${((data.aulas.mes_atual.canceladas / (data.aulas.mes_atual.realizadas + data.aulas.mes_atual.canceladas)) * 100).toFixed(1)}% das aulas do mês`
                : "sem aulas no mês"
            }
          />
        </div>
      </div>

      {/* Gráfico histórico */}
      <HistoricoChart data={data.historico_mensal} />

      {/* Turmas */}
      <div className="space-y-3">
        <SectionTitle>Turmas</SectionTitle>
        {data.turmas.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma turma atribuída.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.turmas.map((t) => (
              <Link
                key={t.id}
                href={`/admin/turmas/${t.id}`}
                className="block bg-surface border border-border rounded-xl p-4 hover:border-primary-400 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{t.nome}</span>
                  <Badge variant={t.status === "ativa" ? "success" : "neutral"}>{t.status}</Badge>
                </div>
                <p className="text-xs text-muted mt-1">{t.num_alunos} aluno(s) ativo(s)</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Aniversários */}
      <div className="space-y-3">
        <SectionTitle>
          Aniversários — semana atual e próxima
          {aniversarios.length === 0 && <span className="text-xs font-normal text-muted ml-2 normal-case tracking-normal">Nenhum</span>}
        </SectionTitle>
        {aniversarios.length > 0 && (() => {
          const hojeStr = (() => {
            const d = new Date();
            return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
          })();
          return (
            <div className="bg-surface border border-border rounded-xl divide-y divide-border">
              {aniversarios.map((a) => {
                const isHoje = a.aniversario === hojeStr;
                const dataFormatada = (() => {
                  if (!a.aniversario) return "-";
                  const [dd, mm] = a.aniversario.split("/").map(Number);
                  const mes = new Date(2000, mm - 1, dd).toLocaleDateString("pt-BR", { month: "long" });
                  return `${String(dd).padStart(2,"0")} de ${mes}`;
                })();
                return (
                  <div key={a.pessoa_id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className={`text-sm ${isHoje ? "font-bold text-primary-600" : "text-foreground"}`}>
                      {a.pessoa.nome}
                      {isHoje && <span className="ml-2 text-xs bg-primary-100 text-primary-700 rounded-full px-2 py-0.5">🎂 Hoje!</span>}
                    </span>
                    <span className="text-xs text-muted shrink-0">{dataFormatada}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Modal gerar semana */}
      {modalState !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={modalState === "report" ? handleFecharModal : undefined} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border border-border p-6 shadow-xl space-y-4 max-h-[80vh] flex flex-col">

            {(modalState === "checking" || modalState === "generating") && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <span className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
                <p className="text-sm text-muted">
                  {modalState === "checking" ? "Verificando semana..." : "Gerando aulas..."}
                </p>
              </div>
            )}

            {(modalState === "report" || modalState === "done") && relatorio && (() => {
              const totalConflitos = relatorio.itens.reduce((acc, i) => acc + i.conflitos.length, 0);
              const temConflito = totalConflitos > 0;
              const podeCriar = !temConflito && relatorio.total_aulas > 0;
              return (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {modalState === "done" ? "Aulas geradas" : "Pré-visualização"}
                    </h2>
                    <p className="text-sm text-muted mt-0.5">{semanaLabel}</p>
                  </div>

                  {relatorio.itens.length === 0 && (
                    <p className="text-sm text-muted">Nenhuma turma ativa encontrada para este professor.</p>
                  )}

                  {relatorio.itens.length > 0 && relatorio.itens.every(i => i.sem_horario) && (
                    <p className="text-sm text-amber-600">Nenhuma turma possui horário cadastrado. Adicione horários às turmas para gerar aulas.</p>
                  )}

                  {temConflito && modalState === "report" && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                      <p className="text-sm font-medium text-red-700">Não é possível gerar a agenda da semana</p>
                      <p className="text-xs text-red-600 mt-1">
                        O professor possui {totalConflitos} conflito(s) de horário. Resolva os conflitos abaixo antes de gerar as aulas.
                      </p>
                    </div>
                  )}

                  <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                    {relatorio.itens.map((item) => (
                      <div key={item.turma_id} className="border border-border rounded-lg px-3 py-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{item.turma_nome}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.sem_horario && <Badge variant="warning">sem horário</Badge>}
                            {!item.sem_horario && item.aulas_a_criar > 0 && (
                              <Badge variant="success">{item.aulas_a_criar} aula(s)</Badge>
                            )}
                            {item.conflitos.length > 0 && (
                              <Badge variant="error">{item.conflitos.length} conflito(s)</Badge>
                            )}
                          </div>
                        </div>
                        {item.conflitos.map((c, i) => (
                          <p key={i} className="text-xs text-red-600">⚠ {c}</p>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 justify-end pt-2 border-t border-border">
                    <Button variant="ghost" onClick={handleFecharModal}>
                      {modalState === "done" ? "Fechar" : "Cancelar"}
                    </Button>
                    {modalState === "report" && podeCriar && (
                      <Button onClick={handleConfirmar}>
                        Confirmar e gerar {relatorio.total_aulas} aula(s)
                      </Button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
