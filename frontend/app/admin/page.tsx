"use client";
import { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { alunosService, type Aluno } from "@/services/admin/alunos";
import { turmasService } from "@/services/admin/turmas";
import { aulasService } from "@/services/admin/aulas";
import { reposicoesService, type ReposicaoPendente } from "@/services/admin/reposicoes";
import { contratosService } from "@/services/admin/contratos";
import { authService } from "@/services/auth";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import type { Aula } from "@/services/admin/aulas";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const role = authService.getRole();
  useEffect(() => {
    if (role === "professor") router.replace("/admin/aulas");
  }, [role]);
  if (role === "professor") return null;
  const isAdmin = role === "admin";
  const [stats, setStats] = useState({ alunos: 0, turmas: 0, aulasHoje: 0 });
  const [indicadores, setIndicadores] = useState<{
    receita_mensal_prevista: number;
    total_ativos: number;
    expirando_30_dias: number;
    sem_assinado: number;
    rascunhos: number;
  } | null>(null);
  const [aulasRecentes, setAulasRecentes] = useState<Aula[]>([]);
  const [aniversarios, setAniversarios] = useState<Aluno[]>([]);
  const [reposicoes, setReposicoes] = useState<ReposicaoPendente[]>([]);
  const [loading, setLoading] = useState(true);

  const hojeStr = (() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  })();

  // Detecta se os aniversários retornados são do fallback (próximos 5 em geral)
  // ou da semana atual/próxima — verificando se algum está nas próximas 2 semanas
  const isFallback = (() => {
    if (aniversarios.length === 0) return false;
    const hoje = new Date();
    const fim = new Date(hoje);
    fim.setDate(fim.getDate() - hoje.getDay() + (hoje.getDay() === 0 ? 0 : 7) + 7); // fim da próxima semana
    return !aniversarios.some((a) => {
      if (!a.aniversario) return false;
      const [dd, mm] = a.aniversario.split("/").map(Number);
      const candidato = new Date(hoje.getFullYear(), mm - 1, dd);
      if (candidato < hoje) candidato.setFullYear(hoje.getFullYear() + 1);
      return candidato <= fim;
    });
  })();

  useEffect(() => {
    async function load() {
      try {
        const hoje = new Date().toISOString().split("T")[0];
        if (isAdmin) {
          const [alunos, turmas, aulasHoje, proximas, aniv, repos, ind] = await Promise.all([
            alunosService.listar({ status: "ativo", page_size: 1 }),
            turmasService.listar({ status: "ativa", page_size: 500 }),
            aulasService.listar({ data_inicio: hoje, data_fim: hoje, page_size: 100 }),
            aulasService.listar({ status: "agendada", page_size: 5 }),
            alunosService.aniversarios(),
            reposicoesService.listar(),
            contratosService.indicadores(),
          ]);
          setStats({ alunos: alunos.total, turmas: turmas.total, aulasHoje: aulasHoje.total });
          setAulasRecentes(proximas.items);
          setAniversarios(aniv);
          setReposicoes(repos);
          setIndicadores(ind);
        } else {
          const [turmas, aulasHoje, proximas, aniv] = await Promise.all([
            turmasService.listar({ status: "ativa", page_size: 500 }),
            aulasService.listar({ data_inicio: hoje, data_fim: hoje, page_size: 100 }),
            aulasService.listar({ status: "agendada", page_size: 5 }),
            alunosService.aniversarios(),
          ]);
          setStats({ alunos: 0, turmas: turmas.total, aulasHoje: aulasHoje.total });
          setAulasRecentes(proximas.items);
          setAniversarios(aniv);
        }
      } catch {
        // erros individuais ja tratados pelo apiAuth — apenas esconde o spinner
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
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isAdmin ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {isAdmin && <StatCard label="Alunos ativos" value={stats.alunos} />}
        <StatCard label="Turmas ativas" value={stats.turmas} />
        <StatCard label="Aulas hoje" value={stats.aulasHoje} />
      </div>

      {isAdmin && indicadores && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Contratos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Receita mensal prevista"
              value={indicadores.receita_mensal_prevista.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            />
            <StatCard
              label="Contratos ativos"
              value={indicadores.total_ativos}
            />
            <StatCard
              label="Expirando em 30 dias"
              value={indicadores.expirando_30_dias}
              warning={indicadores.expirando_30_dias > 0}
              href="/admin/contratos?status=ativo"
            />
            <StatCard
              label="Rascunhos pendentes"
              value={indicadores.rascunhos}
              warning={indicadores.rascunhos > 0}
              href="/admin/contratos?status=rascunho"
            />
          </div>
        </div>
      )}

      {isAdmin && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            {isFallback ? "Próximos aniversários" : "Aniversários — semana atual e próxima"}
            {aniversarios.length === 0 && <span className="text-sm font-normal text-muted ml-2">Nenhum</span>}
          </h2>
          {aniversarios.length > 0 && (
            <Table<Aluno>
              keyExtractor={(a) => a.pessoa_id}
              data={aniversarios}
              columns={[
                {
                  header: "Aluno",
                  render: (a) => (
                    <span className={a.aniversario === hojeStr ? "font-bold text-primary-600" : ""}>
                      {a.pessoa.nome}
                      {a.aniversario === hojeStr && (
                        <span className="ml-2 text-xs bg-primary-100 text-primary-700 rounded-full px-2 py-0.5">🎂 Hoje!</span>
                      )}
                    </span>
                  ),
                },
                {
                  header: "Data",
                  render: (a) => {
                    if (!a.aniversario) return "-";
                    const [dd, mm] = a.aniversario.split("/").map(Number);
                    const mes = new Date(2000, mm - 1, dd).toLocaleDateString("pt-BR", { month: "long" });
                    return `${String(dd).padStart(2, "0")} de ${mes}`;
                  },
                },
              ]}
            />
          )}
        </div>
      )}

      {isAdmin && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Reposições pendentes
            {reposicoes.length === 0 && <span className="text-sm font-normal text-muted ml-2">Nenhuma</span>}
          </h2>
          {reposicoes.length > 0 && (
            <Table<ReposicaoPendente>
              keyExtractor={(r) => r.id}
              data={reposicoes}
              columns={[
                { header: "Aluno", render: (r) => r.aluno?.pessoa.nome ?? "-" },
                { header: "Aula perdida", render: (r) => r.aula_origem ? new Date(r.aula_origem.data + "T00:00:00").toLocaleDateString("pt-BR") : "-" },
                { header: "Horário", render: (r) => r.aula_origem ? `${r.aula_origem.hora_inicio.slice(0,5)} – ${r.aula_origem.hora_fim.slice(0,5)}` : "-" },
              ]}
            />
          )}
        </div>
      )}

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

function StatCard({ label, value, warning, href }: { label: string; value: number | string; warning?: boolean; href?: string }) {
  const content = (
    <div className={["bg-surface border rounded-xl p-5 transition-colors", href ? "hover:bg-border cursor-pointer" : "", warning ? "border-rose-200" : "border-border"].join(" ")}>
      <p className="text-sm text-muted">{label}</p>
      <p className={["text-2xl font-bold mt-1", warning ? "text-rose-600" : "text-foreground"].join(" ")}>{value}</p>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
