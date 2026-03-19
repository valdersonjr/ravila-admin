"use client";
import { useEffect, useState } from "react";
import { alunosService } from "@/services/admin/alunos";
import { turmasService } from "@/services/admin/turmas";
import { aulasService } from "@/services/admin/aulas";
import { authService } from "@/services/auth";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import type { Aula } from "@/services/admin/aulas";
import Link from "next/link";

export default function DashboardPage() {
  const isAdmin = authService.getRole() === "admin";
  const [stats, setStats] = useState({ alunos: 0, turmas: 0, aulasHoje: 0, inadimplentes: 0 });
  const [aulasRecentes, setAulasRecentes] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const hoje = new Date().toISOString().split("T")[0];
        if (isAdmin) {
          const [alunos, inadimplentes, turmas, aulasHoje, proximas] = await Promise.all([
            alunosService.listar({ status: "ativo" }),
            alunosService.listar({ inadimplente: true }),
            turmasService.listar({ status: "ativa" }),
            aulasService.listar({ data_inicio: hoje, data_fim: hoje }),
            aulasService.listar({ status: "agendada" }),
          ]);
          setStats({ alunos: alunos.length, turmas: turmas.length, aulasHoje: aulasHoje.length, inadimplentes: inadimplentes.length });
          setAulasRecentes(proximas.slice(0, 5));
        } else {
          const [turmas, aulasHoje, proximas] = await Promise.all([
            turmasService.listar({ status: "ativa" }),
            aulasService.listar({ data_inicio: hoje, data_fim: hoje }),
            aulasService.listar({ status: "agendada" }),
          ]);
          setStats({ alunos: 0, turmas: turmas.length, aulasHoje: aulasHoje.length, inadimplentes: 0 });
          setAulasRecentes(proximas.slice(0, 5));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-40"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;

  const statusVariant: Record<string, "success" | "warning" | "neutral"> = { realizada: "success", agendada: "warning", cancelada: "neutral" };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-2"}`}>
        {isAdmin && <StatCard label="Alunos ativos" value={stats.alunos} />}
        <StatCard label="Turmas ativas" value={stats.turmas} />
        <StatCard label="Aulas hoje" value={stats.aulasHoje} />
        {isAdmin && <StatCard label="Inadimplentes" value={stats.inadimplentes} warning={stats.inadimplentes > 0} />}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Próximas aulas</h2>
        <Table<Aula>
          keyExtractor={(a) => a.id}
          data={aulasRecentes}
          columns={[
            { header: "Data", render: (a) => new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR") },
            { header: "Turma", render: (a) => a.turma?.nome ?? "-" },
            { header: "Professor", render: (a) => a.professor_nome_snapshot },
            { header: "Horário", render: (a) => `${a.hora_inicio.slice(0,5)} – ${a.hora_fim.slice(0,5)}` },
            { header: "Status", render: (a) => <Badge variant={statusVariant[a.status] ?? "neutral"}>{a.status}</Badge> },
          ]}
        />
        <Link href="/admin/aulas" className="text-sm text-primary-500 hover:underline mt-2 inline-block">Ver todas as aulas →</Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, warning }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={["text-2xl font-bold mt-1", warning ? "text-rose-600" : "text-foreground"].join(" ")}>{value}</p>
    </div>
  );
}
