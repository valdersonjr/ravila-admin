"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { alunosService, type Aluno } from "@/services/admin/alunos";
import { contratosService, type Contrato } from "@/services/admin/contratos";
import { presencasService, type PresencaDoAluno } from "@/services/admin/presencas";
import { avaliacoesService, type AvaliacaoDesempenhoAluno, STATUS_LABELS } from "@/services/admin/avaliacoes";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth";
import Link from "next/link";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <span className="text-xs text-muted font-medium w-44 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value ?? "—"}</span>
    </div>
  );
}

const contratoStatusVariant: Record<string, "success" | "warning" | "neutral"> = {
  ativo: "success",
  rascunho: "warning",
  encerrado: "neutral",
  rescindido: "neutral",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function AlunoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [presencas, setPresencas] = useState<PresencaDoAluno[]>([]);
  const [presencasTotal, setPresencasTotal] = useState(0);
  const [presencasPage, setPresencasPage] = useState(1);
  const [presencasLoading, setPresencasLoading] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoDesempenhoAluno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      alunosService.buscar(Number(id)),
      contratosService.listar({ aluno_id: Number(id), page_size: 50 }),
      presencasService.listarPorAluno(Number(id), 1),
      avaliacoesService.listarPorAluno(Number(id)),
    ])
      .then(([a, c, p, avs]) => {
        setAluno(a);
        setContratos(c.items);
        setPresencas(p.items);
        setPresencasTotal(p.total);
        setAvaliacoes(avs);
      })
      .catch(() => router.push("/admin/alunos"))
      .finally(() => setLoading(false));
  }, [id]);

  async function loadPresencas(page: number) {
    setPresencasLoading(true);
    try {
      const p = await presencasService.listarPorAluno(Number(id), page);
      setPresencas(p.items);
      setPresencasTotal(p.total);
      setPresencasPage(page);
    } finally {
      setPresencasLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center h-20 items-center">
        <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!aluno) return null;

  const isAdmin = authService.getRole() === "admin";
  const matriculasAtivas = (aluno.matriculas ?? []).filter(
    (m) => m.status === "ativa" && m.turma
  );
  const contratoAtivo = contratos.find((c) => c.status === "ativo");
  const historico = contratos.filter((c) => c.status !== "ativo");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{aluno.pessoa.nome}</h1>
          <Badge variant={aluno.status === "ativo" ? "success" : "neutral"}>
            {aluno.status === "ativo" ? "Matrícula ativa" : "Sem matrícula ativa"}
          </Badge>
          <Badge variant={aluno.tem_contrato_ativo ? "success" : "neutral"}>
            {aluno.tem_contrato_ativo ? "Contrato ativo" : "Sem contrato ativo"}
          </Badge>
        </div>
        <Link href={`/admin/alunos/${aluno.pessoa_id}/editar`}>
          <Button variant="outline" size="sm">Editar</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados pessoais */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Dados pessoais</h2>
          <div className="space-y-3">
            <InfoRow label="CPF" value={aluno.pessoa.cpf ?? "—"} />
            <InfoRow label="E-mail" value={aluno.pessoa.email ?? "—"} />
            <InfoRow label="Telefone" value={aluno.pessoa.telefone ?? "—"} />
            <InfoRow label="Data de nascimento" value={aluno.data_nascimento ? formatDate(aluno.data_nascimento) : "—"} />
            <InfoRow label="Aniversário" value={aluno.aniversario ?? "—"} />
          </div>
        </div>

        {/* Acadêmico */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Acadêmico</h2>
          <div className="space-y-3">
            <InfoRow label="Nível" value={aluno.nivel?.nome ?? "—"} />
            {aluno.responsavel && (
              <InfoRow label="Responsável" value={aluno.responsavel.nome} />
            )}
            <InfoRow
              label="Turmas ativas"
              value={
                matriculasAtivas.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {matriculasAtivas.map((m) => (
                      <span key={m.id} className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        {m.turma!.nome}
                      </span>
                    ))}
                  </div>
                ) : "—"
              }
            />
          </div>
        </div>
      </div>

      {/* Contrato ativo em destaque */}
      {contratoAtivo && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Contrato em vigor</h2>
              <Badge variant="success">ativo</Badge>
            </div>
            {isAdmin && (
              <Link href={`/admin/contratos/${contratoAtivo.id}`} className="text-primary-600 hover:underline text-sm shrink-0">
                Ver contrato
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div>
              <p className="text-xs text-muted font-medium">Modalidade</p>
              <p className="text-sm text-foreground font-medium mt-0.5">{contratoAtivo.curso}</p>
            </div>
            {isAdmin && (
              <div>
                <p className="text-xs text-muted font-medium">Mensalidade</p>
                <p className="text-sm text-foreground font-medium mt-0.5">
                  {Number(contratoAtivo.valor_mensalidade).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                {(contratoAtivo.desconto_percentual || contratoAtivo.desconto_valor) && (() => {
                  const v = Number(contratoAtivo.valor_mensalidade);
                  const comDesconto = contratoAtivo.desconto_percentual
                    ? v * (1 - Number(contratoAtivo.desconto_percentual) / 100)
                    : Math.max(v - Number(contratoAtivo.desconto_valor), 0);
                  return (
                    <p className="text-xs text-primary-600 font-medium mt-0.5">
                      Com desconto: {comDesconto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  );
                })()}
              </div>
            )}
            <div>
              <p className="text-xs text-muted font-medium">Início</p>
              <p className="text-sm text-foreground font-medium mt-0.5">{formatDate(contratoAtivo.data_inicio)}</p>
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Término</p>
              <p className="text-sm text-foreground font-medium mt-0.5">{formatDate(contratoAtivo.data_fim)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Presenças */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Presenças</h2>
            {presencasTotal > 0 && (
              <p className="text-xs text-muted mt-0.5">{presencasTotal} registro{presencasTotal !== 1 ? "s" : ""} no total</p>
            )}
          </div>
          {presencasTotal > 0 && (() => {
            const totalFaltas = presencas.filter((p) => !p.presente).length;
            const totalPresentes = presencas.filter((p) => p.presente).length;
            return (
              <div className="flex gap-3 text-sm">
                <span className="text-success-600 font-medium">{totalPresentes} presente{totalPresentes !== 1 ? "s" : ""}</span>
                <span className="text-muted">·</span>
                <span className={totalFaltas > 0 ? "text-red-500 font-medium" : "text-muted"}>{totalFaltas} falta{totalFaltas !== 1 ? "s" : ""}</span>
              </div>
            );
          })()}
        </div>

        {presencasLoading ? (
          <div className="flex justify-center h-10 items-center">
            <span className="w-5 h-5 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
          </div>
        ) : presencas.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma presença registrada.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Data</th>
                    <th className="px-4 py-2 text-left font-medium">Turma</th>
                    <th className="px-4 py-2 text-left font-medium">Horário</th>
                    <th className="px-4 py-2 text-left font-medium">Tipo</th>
                    <th className="px-4 py-2 text-left font-medium">Presença</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {presencas.map((p) => (
                    <tr key={p.id} className="hover:bg-border transition-colors">
                      <td className="px-4 py-2 text-foreground">{formatDate(p.aula.data)}</td>
                      <td className="px-4 py-2 text-foreground">{p.aula.turma?.nome ?? <span className="text-muted italic">Experimental</span>}</td>
                      <td className="px-4 py-2 text-muted">{p.aula.hora_inicio} – {p.aula.hora_fim}</td>
                      <td className="px-4 py-2 text-muted capitalize">{p.tipo}</td>
                      <td className="px-4 py-2">
                        <Badge variant={p.presente ? "success" : "neutral"}>
                          {p.presente ? "Presente" : "Falta"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {presencasTotal > 20 && (
              <div className="flex items-center justify-between text-sm text-muted pt-1">
                <span>Página {presencasPage} de {Math.ceil(presencasTotal / 20)}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={presencasPage <= 1} onClick={() => loadPresencas(presencasPage - 1)}>← Anterior</Button>
                  <Button variant="outline" size="sm" disabled={presencasPage >= Math.ceil(presencasTotal / 20)} onClick={() => loadPresencas(presencasPage + 1)}>Próxima →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Desempenho em avaliações */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Desempenho em avaliações</h2>
        {avaliacoes.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma avaliação realizada ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Avaliação</th>
                  <th className="px-4 py-2 text-left font-medium">Turma</th>
                  <th className="px-4 py-2 text-left font-medium">Data</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Nota</th>
                  <th className="px-4 py-2 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {avaliacoes.map((av) => (
                  <tr key={av.id} className="hover:bg-border transition-colors">
                    <td className="px-4 py-2 text-foreground font-medium">{av.titulo}</td>
                    <td className="px-4 py-2 text-muted">{av.turma_nome ?? "—"}</td>
                    <td className="px-4 py-2 text-muted">
                      {av.data_aplicacao
                        ? new Date(av.data_aplicacao + "T00:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        av.status_aluno === "concluida" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {av.status_aluno === "concluida" ? "Concluída" : "Aguardando correção"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {av.nota_final != null ? (
                        <span className={`font-semibold ${av.nota_final >= 70 ? "text-emerald-600" : av.nota_final >= 50 ? "text-amber-600" : "text-red-500"}`}>
                          {av.nota_final.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/admin/avaliacoes/${av.id}`} className="text-primary-600 hover:underline text-xs">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Histórico de contratos / sem contrato */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            {contratoAtivo ? "Histórico de contratos" : "Contratos"}
          </h2>
          <Link href="/admin/contratos/novo">
            <Button variant="outline" size="sm">+ Novo contrato</Button>
          </Link>
        </div>

        {contratos.length === 0 ? (
          <p className="text-sm text-muted">Nenhum contrato cadastrado para este aluno.</p>
        ) : historico.length === 0 && contratoAtivo ? (
          <p className="text-sm text-muted">Nenhum contrato anterior.</p>
        ) : (
          <div className="space-y-0">
            {(contratoAtivo ? historico : contratos).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant={contratoStatusVariant[c.status] ?? "neutral"}>{c.status}</Badge>
                  <span className="text-sm font-medium text-foreground">#{c.id} · {c.curso}</span>
                  <span className="text-sm text-muted hidden sm:block">
                    {formatDate(c.data_inicio)} – {formatDate(c.data_fim)}
                  </span>
                </div>
                <Link href={`/admin/contratos/${c.id}`} className="text-primary-600 hover:underline text-sm shrink-0">
                  Ver
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
