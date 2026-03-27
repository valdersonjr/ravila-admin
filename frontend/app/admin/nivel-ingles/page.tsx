"use client";
import { useEffect, useState } from "react";
import { nivelInglesService, NIVEIS_CEFR, type NivelInglesAluno } from "@/services/admin/nivelIngles";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";

const MIN_RESPOSTAS = 10;

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function PercentualBadge({ pct, total }: { pct: number; total: number }) {
  if (total === 0) return <span className="text-muted text-sm">—</span>;
  const variant = pct >= 75 ? "success" : pct >= 50 ? "warning" : "error";
  return <Badge variant={variant}>{pct}%</Badge>;
}

function SinalRank({ pct, total }: { pct: number; total: number }) {
  if (total < MIN_RESPOSTAS) return null;
  if (pct >= 75) return <Badge variant="success">Pronto para avançar</Badge>;
  if (pct < 40) return <Badge variant="error">Com dificuldade</Badge>;
  return null;
}

export default function NivelInglesPage() {
  const { showToast } = useToast();
  const [alunos, setAlunos] = useState<NivelInglesAluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<NivelInglesAluno | null>(null);
  const [novoNivel, setNovoNivel] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [liberando, setLiberando] = useState(false);
  const [filtroNivel, setFiltroNivel] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await nivelInglesService.listar();
      setAlunos(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function abrirEdicao(aluno: NivelInglesAluno) {
    setEditando(aluno);
    setNovoNivel(aluno.nivel_atual ?? "A1");
  }

  async function salvar() {
    if (!editando || !novoNivel) return;
    setSalvando(true);
    try {
      await nivelInglesService.atualizar(editando.pessoa_id, novoNivel);
      showToast("Nível atualizado com sucesso", "success");
      setEditando(null);
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar", "error");
    } finally {
      setSalvando(false);
    }
  }

  async function liberarReavaliacao() {
    if (!editando) return;
    setLiberando(true);
    try {
      await nivelInglesService.liberarReavaliacao(editando.pessoa_id);
      showToast(`Reavaliação liberada para ${editando.nome}`, "success");
      setEditando(null);
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erro ao liberar", "error");
    } finally {
      setLiberando(false);
    }
  }

  const alunosFiltrados = filtroNivel === "sem_nivel"
    ? alunos.filter((a) => !a.nivel_atual)
    : filtroNivel
    ? alunos.filter((a) => a.nivel_atual === filtroNivel)
    : alunos;

  const semTeste = alunos.filter((a) => !a.nivel_atual).length;
  const comTeste = alunos.length - semTeste;
  const prontoParaAvancar = alunos.filter((a) => a.total_respondidas >= MIN_RESPOSTAS && a.percentual >= 75).length;
  const comDificuldade = alunos.filter((a) => a.total_respondidas >= MIN_RESPOSTAS && a.percentual < 40).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nível de Inglês</h1>
        <p className="text-sm text-muted mt-1">
          Acompanhe o desempenho dos alunos no banco de questões e libere reavaliações quando necessário.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted uppercase tracking-widest">Total</p>
          <p className="text-2xl font-black text-foreground mt-1">{alunos.length}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted uppercase tracking-widest">Avaliados</p>
          <p className="text-2xl font-black text-green-600 mt-1">{comTeste}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted uppercase tracking-widest">Prontos para avançar</p>
          <p className="text-2xl font-black text-green-600 mt-1">{prontoParaAvancar}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted uppercase tracking-widest">Com dificuldade</p>
          <p className="text-2xl font-black text-red-500 mt-1">{comDificuldade}</p>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
          className="w-40"
          options={[
            { value: "", label: "Todos os níveis" },
            { value: "sem_nivel", label: "Sem nível" },
            ...NIVEIS_CEFR.map((n) => ({ value: n, label: n })),
          ]}
        />
        <span className="text-sm text-muted">{alunosFiltrados.length} aluno(s)</span>
      </div>

      {/* Tabela */}
      <Table
        data={alunosFiltrados}
        keyExtractor={(a) => a.pessoa_id}
        emptyMessage="Nenhum aluno encontrado."
        columns={[
          {
            header: "Aluno",
            render: (a) => <span className="font-medium text-foreground">{a.nome}</span>,
          },
          {
            header: "Nível certificado",
            render: (a) => a.nivel_atual
              ? <Badge variant="primary">{a.nivel_atual}</Badge>
              : <span className="text-muted text-sm">Não avaliado</span>,
          },
          {
            header: "Avaliado em",
            render: (a) => <span className="text-sm text-muted">{formatDate(a.avaliado_em)}</span>,
          },
          {
            header: "Acurácia no banco",
            render: (a) => <PercentualBadge pct={a.percentual} total={a.total_respondidas} />,
          },
          {
            header: "Sinal",
            render: (a) => <SinalRank pct={a.percentual} total={a.total_respondidas} />,
          },
          {
            header: "Ações",
            render: (a) => (
              <Button size="sm" variant="outline" onClick={() => abrirEdicao(a)}>
                Gerenciar
              </Button>
            ),
          },
        ]}
      />

      {/* Modal de edição */}
      {editando && (
        <Modal title={`Gerenciar nível — ${editando.nome}`} onClose={() => setEditando(null)}>
          <div className="space-y-4">
            {/* Desempenho */}
            {editando.total_respondidas > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4 text-sm space-y-2">
                <p className="text-muted">Desempenho no banco (últimas {editando.total_respondidas} respostas no nível atual)</p>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-foreground">{editando.acertos} acertos — {editando.percentual}%</p>
                  <SinalRank pct={editando.percentual} total={editando.total_respondidas} />
                </div>
              </div>
            )}

            {/* Alterar nível manualmente */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Alterar nível certificado</label>
              <Select
                value={novoNivel}
                onChange={(e) => setNovoNivel(e.target.value)}
                options={NIVEIS_CEFR.map((n) => ({ value: n, label: n }))}
              />
              <p className="text-xs text-muted mt-1">
                A data de avaliação será atualizada para hoje.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
              <Button onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : "Confirmar nível"}
              </Button>
            </div>

            {/* Liberar reavaliação */}
            {editando.nivel_atual && (
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground mb-1">Liberar reavaliação</p>
                <p className="text-xs text-muted mb-3">
                  O aluno poderá refazer o teste de proficiência. O nível atual é mantido até a conclusão do novo teste.
                </p>
                <Button
                  variant="outline"
                  onClick={liberarReavaliacao}
                  disabled={liberando}
                  className="w-full"
                >
                  {liberando ? "Liberando..." : "Liberar reavaliacao"}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
