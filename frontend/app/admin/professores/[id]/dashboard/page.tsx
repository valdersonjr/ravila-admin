"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { professoresService, type ProfessorDashboard } from "@/services/admin/professores";
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
              formatter={(v: number) => [`${v}${unit}`, label]}
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

export default function ProfessorDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ProfessorDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    professoresService.dashboard(Number(id))
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center h-40 items-center">
        <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-muted">Professor não encontrado.</p>;

  const fmt = (v: number) =>
    `R$ ${Number(v).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
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
            <Badge variant={data.tipo_contrato === "clt" ? "primary" : "warning"}>{data.tipo_contrato.toUpperCase()}</Badge>
          </div>
          <p className="text-sm text-muted">CPF: {data.cpf}</p>
          {data.tipo_contrato === "clt" && data.salario != null && (
            <p className="text-sm text-muted">Salário: {fmt(data.salario)}/mês</p>
          )}
          {data.tipo_contrato === "pj" && data.valor_por_aula != null && (
            <p className="text-sm text-muted">Valor/aula: {fmt(data.valor_por_aula)}</p>
          )}
        </div>
        <div className="flex gap-2">
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

      {/* Custo */}
      <div className="space-y-3">
        <SectionTitle>Custo</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label={`Custo estimado — ${mesAtual}`}
            value={data.custo_mes_atual != null ? fmt(data.custo_mes_atual) : "—"}
            sub={
              data.tipo_contrato === "pj"
                ? `${data.aulas.mes_atual.realizadas} aulas × ${data.valor_por_aula != null ? fmt(data.valor_por_aula) : "—"}`
                : "salário fixo CLT"
            }
          />
          <StatCard
            label="Total já pago (histórico)"
            value={fmt(data.custo_total_pago)}
            sub={`${data.historico_pagamentos.length} pagamento(s) registrado(s)`}
          />
        </div>

        {data.historico_pagamentos.length > 0 && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Referência</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Aulas</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Forma</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Data pag.</th>
                </tr>
              </thead>
              <tbody>
                {data.historico_pagamentos.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-primary-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{p.referencia}</td>
                    <td className="px-4 py-3 text-foreground">{fmt(p.valor_total)}</td>
                    <td className="px-4 py-3 text-muted">{p.aulas_realizadas_snapshot ?? "—"}</td>
                    <td className="px-4 py-3 text-muted capitalize">{p.forma ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">
                      {p.data_pagamento
                        ? new Date(p.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{t.nome}</span>
                  <Badge variant={t.status === "ativa" ? "success" : "neutral"}>{t.status}</Badge>
                </div>
                <p className="text-xs text-muted mt-1">{t.num_alunos} aluno(s) ativo(s)</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
