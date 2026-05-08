"use client";
import { useEffect, useRef, useState } from "react";
import {
  nivelInglesService,
  NIVEIS_CEFR,
  type NivelInglesAluno,
  type NivelInglesStats,
} from "@/services/admin/nivelIngles";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";

const PAGE_SIZE = 10;
const MIN_RESPOSTAS_PARA_AVALIACAO = 10;
const PERCENTUAL_PRONTO_PARA_AVANCAR = 75;
const PERCENTUAL_COM_DIFICULDADE = 40;

function formatDate(iso: string | null) {
  if (!iso) return "Não informado";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getStatusDesempenho(pct: number, total: number): "pronto" | "dificuldade" | null {
  if (total < MIN_RESPOSTAS_PARA_AVALIACAO) return null;
  if (pct >= PERCENTUAL_PRONTO_PARA_AVANCAR) return "pronto";
  if (pct < PERCENTUAL_COM_DIFICULDADE) return "dificuldade";
  return null;
}

function DesempenhoCell({ pct, total, nivel }: { pct: number; total: number; nivel: string | null }) {
  if (!nivel) return <span className="text-muted text-sm">—</span>;
  if (total === 0) return <span className="text-muted text-sm">Sem respostas em {nivel}</span>;
  const sinal = getStatusDesempenho(pct, total);
  const barColor = pct >= PERCENTUAL_PRONTO_PARA_AVANCAR ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{pct}%</span>
        <span className="text-xs text-muted">{total} questões {nivel}</span>
      </div>
      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {sinal === "pronto" && <span className="text-xs font-medium text-green-600">Pronto para avançar</span>}
      {sinal === "dificuldade" && <span className="text-xs font-medium text-red-500">Com dificuldade</span>}
    </div>
  );
}

export default function NivelInglesPage() {
  const { showToast } = useToast();

  const [stats, setStats] = useState<NivelInglesStats | null>(null);
  const [alunos, setAlunos] = useState<NivelInglesAluno[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");

  const [editando, setEditando] = useState<NivelInglesAluno | null>(null);
  const [novoNivel, setNovoNivel] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [liberando, setLiberando] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadStats() {
    try {
      setStats(await nivelInglesService.stats());
    } catch (err) {
      console.warn("Erro ao carregar stats de nível:", err);
    }
  }

  async function load(p = page) {
    setLoading(true);
    try {
      const data = await nivelInglesService.listar({
        page: p, page_size: PAGE_SIZE,
        search: search || undefined,
        nivel: filtroNivel || undefined,
      });
      setAlunos(data.items);
      setTotal(data.total);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { load(page); }, [page, search, filtroNivel]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setSearch(value); setPage(1); }, 250);
  }

  function handleFiltroNivel(value: string) {
    setFiltroNivel(value);
    setPage(1);
  }

  function abrirEdicao(aluno: NivelInglesAluno) {
    setEditando(aluno);
    setNovoNivel(aluno.nivel_atual ?? "A1");
  }

  async function salvar() {
    if (!editando || !novoNivel) return;
    setSalvando(true);
    try {
      await nivelInglesService.atualizar(editando.pessoa_id, novoNivel);
      showToast("Nível atualizado!", "success");
      setEditando(null);
      await Promise.all([load(page), loadStats()]);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar", "error");
    } finally { setSalvando(false); }
  }

  async function liberarReavaliacao() {
    if (!editando) return;
    setLiberando(true);
    try {
      await nivelInglesService.liberarReavaliacao(editando.pessoa_id);
      showToast(`Reavaliação liberada para ${editando.nome}`, "success");
      setEditando(null);
      await Promise.all([load(page), loadStats()]);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erro ao liberar", "error");
    } finally { setLiberando(false); }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const statusDesempenhoEditando = editando ? getStatusDesempenho(editando.percentual, editando.total_respondidas) : null;

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nível de Inglês</h1>
        <p className="text-sm text-muted mt-1">Acompanhe o desempenho dos alunos e libere reavaliações quando necessário.</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted uppercase tracking-widest">Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats?.total ?? "Não informado"}</p>
        </div>
        <button
          onClick={() => handleFiltroNivel(filtroNivel === "sem_nivel" ? "" : "sem_nivel")}
          className={`text-left rounded-xl p-4 border transition-colors bg-surface ${filtroNivel === "sem_nivel" ? "border-primary-400 ring-1 ring-primary-400" : "border-border hover:border-primary-300"}`}
          title="Filtrar por sem avaliação"
        >
          <p className="text-xs text-muted uppercase tracking-widest">Sem avaliação</p>
          <p className="text-2xl font-bold text-muted mt-1">{stats?.sem_nivel ?? "Não informado"}</p>
        </button>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted uppercase tracking-widest">Prontos para avançar</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats?.pronto_para_avancar ?? "Não informado"}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted uppercase tracking-widest">Com dificuldade</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{stats?.com_dificuldade ?? "Não informado"}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar aluno..."
          className="w-56"
        />
        <Select
          value={filtroNivel}
          onChange={(e) => handleFiltroNivel(e.target.value)}
          className="w-44"
          options={[
            { value: "", label: "Todos os níveis" },
            { value: "sem_nivel", label: "Sem nível" },
            ...NIVEIS_CEFR.map((n) => ({ value: n, label: n })),
          ]}
        />
        {(search || filtroNivel) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSearchInput(""); handleFiltroNivel(""); }}>
            Limpar
          </Button>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center h-20 items-center">
          <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          <Table
            data={alunos}
            keyExtractor={(a) => a.pessoa_id}
            emptyMessage="Nenhum aluno encontrado."
            columns={[
              {
                header: "Aluno",
                render: (a) => (
                  <div>
                    <p className="font-medium text-foreground">{a.nome}</p>
                    <p className="text-xs text-muted">Avaliado em {formatDate(a.avaliado_em)}</p>
                  </div>
                ),
              },
              {
                header: "Nível de Inglês",
                render: (a) => a.nivel_atual
                  ? <Badge variant="primary">{a.nivel_atual}</Badge>
                  : <span className="text-xs text-muted font-medium">Sem avaliação</span>,
              },
              {
                header: "Progresso",
                render: (a) => <DesempenhoCell pct={a.percentual} total={a.total_respondidas} nivel={a.nivel_atual} />,
              },
              {
                header: "",
                render: (a) => (
                  <Button size="sm" variant="outline" onClick={() => abrirEdicao(a)}>
                    Gerenciar
                  </Button>
                ),
              },
            ]}
          />

          <div className="flex items-center justify-between text-sm text-muted">
            <span>{total} aluno{total !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                ← Anterior
              </Button>
              <span className="text-foreground">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                Próxima →
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setEditando(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border shadow-xl overflow-hidden">

            <div className="px-6 pt-5 pb-4 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{editando.nome}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {editando.nivel_atual
                      ? <Badge variant="primary">{editando.nivel_atual}</Badge>
                      : <span className="text-xs text-muted font-medium">Sem avaliação</span>}
                    <span className="text-xs text-muted">· {formatDate(editando.avaliado_em)}</span>
                  </div>
                </div>
                <button onClick={() => setEditando(null)} className="text-muted hover:text-foreground p-1 text-lg leading-none">✕</button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">

              {editando.total_respondidas > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted uppercase tracking-widest">Progresso</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">{editando.percentual}%</span>
                    <span className="text-sm text-muted">{editando.acertos} de {editando.total_respondidas} questões</span>
                  </div>
                  <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${editando.percentual >= PERCENTUAL_PRONTO_PARA_AVANCAR ? "bg-green-500" : editando.percentual >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                      style={{ width: `${editando.percentual}%` }}
                    />
                  </div>
                  {statusDesempenhoEditando === "pronto" && <p className="text-sm text-green-600 font-medium">Pronto para avançar.</p>}
                  {statusDesempenhoEditando === "dificuldade" && <p className="text-sm text-red-500 font-medium">Com dificuldade no nível atual.</p>}
                </div>
              ) : (
                <p className="text-sm text-muted">Ainda sem respostas no banco de questões.</p>
              )}

              {editando.nivel_atual && (
                <div className="space-y-2">
                  <p className="text-xs text-muted uppercase tracking-widest">Reavaliação</p>
                  <p className="text-sm text-muted">O aluno poderá refazer o teste de proficiência. O nível atual é mantido até a conclusão.</p>
                  <Button onClick={liberarReavaliacao} disabled={liberando} className="w-full">
                    {liberando ? "Liberando..." : "Liberar reavaliação"}
                  </Button>
                </div>
              )}

              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-xs text-muted uppercase tracking-widest">Ajuste manual</p>
                <Select
                  value={novoNivel}
                  onChange={(e) => setNovoNivel(e.target.value)}
                  options={NIVEIS_CEFR.map((n) => ({ value: n, label: n }))}
                />
                <p className="text-xs text-muted">Use apenas se a avaliação foi feita fora do sistema.</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={salvar} disabled={salvando}>
                    {salvando ? "Salvando..." : "Confirmar ajuste"}
                  </Button>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end">
              <Button variant="outline" onClick={() => setEditando(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
