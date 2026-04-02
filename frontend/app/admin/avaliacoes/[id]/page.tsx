"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
function IconChevronLeft() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
}
function IconSearch() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>;
}
function IconTrash() {
  return <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14H6L5 6m5 0V4h4v2"/></svg>;
}
import { avaliacoesService, type AvaliacaoDetail, type AvaliacaoAluno, type RespostaAluno, STATUS_LABELS, STATUS_COLORS, STATUS_ALUNO_LABELS } from "@/services/admin/avaliacoes";
import { questoesService, type Questao, NIVEIS, TOPICOS, DIFICULDADES, TOPICO_LABELS, DIFICULDADE_LABELS, SUBTIPO_LABELS } from "@/services/admin/questoes";
import { aulasService, type Aula } from "@/services/admin/aulas";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/context/ToastContext";

type Tab = "questoes" | "correcao";

export default function AvaliacaoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { showToast } = useToast();

  const [av, setAv] = useState<AvaliacaoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("questoes");

  // Picker de questões
  const [busca, setBusca] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroTopico, setFiltroTopico] = useState("");
  const [filtroDificuldade, setFiltroDificuldade] = useState("");
  const [resultados, setResultados] = useState<Questao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [pesoInput, setPesoInput] = useState<Record<number, string>>({});
  const [adicionando, setAdicionando] = useState<Set<number>>(new Set());
  const [removendo, setRemovendo] = useState<number | null>(null);

  // Edição de metadados
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<{
    titulo: string; modulo: string; descricao: string;
    data_aplicacao: string; hora_inicio: string; hora_fim: string; aula_id: string;
  }>({ titulo: "", modulo: "", descricao: "", data_aplicacao: "", hora_inicio: "", hora_fim: "", aula_id: "" });
  const [aulasOpcoes, setAulasOpcoes] = useState<Aula[]>([]);
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  function abrirEdit() {
    if (!av) return;
    setEditForm({
      titulo: av.titulo,
      modulo: av.modulo ?? "",
      descricao: (av as any).descricao ?? "",
      data_aplicacao: av.data_aplicacao ?? "",
      hora_inicio: av.hora_inicio ? String(av.hora_inicio).slice(0, 5) : "",
      hora_fim: av.hora_fim ? String(av.hora_fim).slice(0, 5) : "",
      aula_id: av.aula_id ? String(av.aula_id) : "",
    });
    aulasService.listar({ turma_id: av.turma_id, page_size: 50 })
      .then((r) => setAulasOpcoes(r.items ?? []))
      .catch(() => {});
    setShowEdit(true);
  }

  async function handleSalvarEdit(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoEdit(true);
    try {
      const updated = await avaliacoesService.atualizar(id, {
        titulo: editForm.titulo.trim() || undefined,
        modulo: editForm.modulo.trim() || undefined,
        descricao: editForm.descricao.trim() || undefined,
        data_aplicacao: editForm.data_aplicacao || undefined,
        hora_inicio: editForm.hora_inicio || undefined,
        hora_fim: editForm.hora_fim || undefined,
        aula_id: editForm.aula_id ? Number(editForm.aula_id) : undefined,
      });
      setAv(updated);
      setShowEdit(false);
      showToast("Avaliação atualizada.");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao salvar."), "error");
    } finally {
      setSalvandoEdit(false);
    }
  }

  // Estender tempo
  const [showExtender, setShowExtender] = useState(false);
  const [novaHoraFim, setNovaHoraFim] = useState("");
  const [extendendo, setExtendendo] = useState(false);

  async function handleExtender() {
    if (!novaHoraFim) return;
    setExtendendo(true);
    try {
      const updated = await avaliacoesService.atualizar(id, { hora_fim: novaHoraFim });
      setAv(updated);
      setShowExtender(false);
      setNovaHoraFim("");
      showToast("Horário atualizado.");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar horário."), "error");
    } finally {
      setExtendendo(false);
    }
  }

  // Correção
  const [alunos, setAlunos] = useState<AvaliacaoAluno[]>([]);
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);
  const [alunoSel, setAlunoSel] = useState<number | null>(null);
  const [respostas, setRespostas] = useState<RespostaAluno[]>([]);
  const [notaInputs, setNotaInputs] = useState<Record<number, string>>({});
  const [comentInputs, setComentInputs] = useState<Record<number, string>>({});
  const [corrigindo, setCorrigindo] = useState<number | null>(null);

  async function loadAv() {
    try {
      const data = await avaliacoesService.buscar(id);
      setAv(data);
    } catch {
      showToast("Erro ao carregar avaliação.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAv();
  }, [id]);

  useEffect(() => {
    if (tab !== "correcao") return;
    setCarregandoAlunos(true);
    avaliacoesService.listarAlunos(id)
      .then(setAlunos)
      .catch(() => showToast("Erro ao carregar alunos.", "error"))
      .finally(() => setCarregandoAlunos(false));
  }, [tab, id]);

  // Busca debounced — dispara sempre que qualquer filtro muda
  useEffect(() => {
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await questoesService.listar({
          contexto: "avaliacao",
          busca: busca.trim() || undefined,
          nivel: filtroNivel || undefined,
          topico: filtroTopico || undefined,
          dificuldade: filtroDificuldade || undefined,
          page_size: 30,
        });
        setResultados(res.items ?? []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [busca, filtroNivel, filtroTopico, filtroDificuldade]);

  async function handleAdicionar(q: Questao) {
    if (!av) return;
    const peso = parseFloat(pesoInput[q.id] ?? "1") || 1;
    setAdicionando((prev) => new Set(prev).add(q.id));
    try {
      const updated = await avaliacoesService.adicionarQuestao(id, {
        questao_id: q.id,
        ordem: av.questoes.length,
        peso,
      });
      setAv(updated);
      showToast("Questão adicionada.");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao adicionar questão."), "error");
    } finally {
      setAdicionando((prev) => { const s = new Set(prev); s.delete(q.id); return s; });
    }
  }

  async function handleRemover(questaoId: number) {
    setRemovendo(questaoId);
    try {
      const updated = await avaliacoesService.removerQuestao(id, questaoId);
      setAv(updated);
      showToast("Questão removida.");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao remover questão."), "error");
    } finally {
      setRemovendo(null);
    }
  }

  async function handlePublicar() {
    if (!av) return;
    try {
      const updated = await avaliacoesService.publicar(id);
      setAv(updated);
      showToast("Avaliação publicada!");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao publicar."), "error");
    }
  }

  async function handleEncerrar() {
    if (!av) return;
    try {
      const updated = await avaliacoesService.encerrar(id);
      setAv(updated);
      showToast("Avaliação encerrada.");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao encerrar."), "error");
    }
  }

  async function handleCarregarRespostas(alunoId: number) {
    setAlunoSel(alunoId);
    try {
      const data = await avaliacoesService.respostasAluno(id, alunoId);
      setRespostas(data);
      const notas: Record<number, string> = {};
      const coments: Record<number, string> = {};
      data.forEach((r) => {
        notas[r.questao_id] = r.nota_manual != null ? String(Math.round(r.nota_manual * 10)) : "";
        coments[r.questao_id] = r.comentario_professor ?? "";
      });
      setNotaInputs(notas);
      setComentInputs(coments);
    } catch {
      showToast("Erro ao carregar respostas.", "error");
    }
  }

  async function handleCorrigir(r: RespostaAluno) {
    const nota = parseFloat(notaInputs[r.questao_id] ?? "0");
    if (isNaN(nota) || nota < 0 || nota > 10) { showToast("Nota deve ser 0–10.", "error"); return; }
    setCorrigindo(r.questao_id);
    try {
      await avaliacoesService.corrigir(id, alunoSel!, r.questao_id, nota / 10, comentInputs[r.questao_id] || undefined);
      showToast("Corrigido!");
      await handleCarregarRespostas(alunoSel!);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao salvar correção."), "error");
    } finally {
      setCorrigindo(null);
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-40">
      <span className="w-7 h-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
    </div>
  );

  if (!av) return <p className="text-sm text-muted">Avaliação não encontrada.</p>;

  const jaAdicionadas = new Set(av.questoes.map((q) => q.questao_id));
  const isRascunho = av.status === "rascunho";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push("/admin/avaliacoes")} className="mt-1 text-muted hover:text-foreground">
          <IconChevronLeft />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground truncate">{av.titulo}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[av.status]}`}>
              {STATUS_LABELS[av.status]}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {(av.topicos ?? []).map((t) => TOPICO_LABELS[t] ?? t).join(", ")}
            {av.modulo && ` · ${av.modulo}`}
            {av.turma_nome && ` · ${av.turma_nome}`}
            {av.data_aplicacao && ` · ${new Date(av.data_aplicacao + "T00:00:00").toLocaleDateString("pt-BR")}`}
            {av.hora_inicio && av.hora_fim && ` · ${String(av.hora_inicio).slice(0, 5)}–${String(av.hora_fim).slice(0, 5)}`}
          </p>
          {av.descricao && <p className="text-xs text-muted mt-1 italic">{av.descricao}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={abrirEdit}>Editar</Button>
          {av.status === "rascunho" && (
            <Button onClick={handlePublicar} disabled={av.questoes.length === 0}>Publicar</Button>
          )}
          {av.status === "publicada" && (
            <>
              <Button variant="outline" onClick={() => { setNovaHoraFim(av.hora_fim ? String(av.hora_fim).slice(0, 5) : ""); setShowExtender(true); }}>
                Estender
              </Button>
              <Button variant="outline" onClick={handleEncerrar}>Encerrar</Button>
            </>
          )}
        </div>
      </div>

      {/* Aula vinculada */}
      {av.aula_id && (
        <a
          href={`/admin/aulas/${av.aula_id}/presencas`}
          className="flex items-center justify-between gap-3 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 hover:bg-primary-100 transition-colors"
        >
          <div>
            <p className="text-xs text-primary-600 font-medium mb-0.5">Aula vinculada</p>
            <p className="text-sm font-semibold text-primary-800">
              {av.aula_data ? new Date(av.aula_data + "T00:00:00").toLocaleDateString("pt-BR") : ""}
              {av.aula_hora_inicio && av.aula_hora_fim && ` · ${String(av.aula_hora_inicio).slice(0, 5)}–${String(av.aula_hora_fim).slice(0, 5)}`}
            </p>
          </div>
          <span className="text-xs text-primary-600 font-medium shrink-0">Ver aula →</span>
        </a>
      )}

      {/* Inline form: estender tempo */}
      {showExtender && (
        <div className="flex items-end gap-3 bg-surface border border-border rounded-xl p-4">
          <Field label="Novo horário de término">
            <Input
              type="time"
              value={novaHoraFim}
              onChange={(e) => setNovaHoraFim(e.target.value)}
              className="w-36"
            />
          </Field>
          <Button loading={extendendo} onClick={handleExtender} disabled={!novaHoraFim}>
            Confirmar
          </Button>
          <Button variant="outline" onClick={() => setShowExtender(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Questões", value: av.questoes.length },
          { label: "Alunos responderam", value: av.total_alunos },
          { label: "Aguardam correção", value: av.total_pendentes },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-foreground">{s.value}</p>
            <p className="text-xs text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-border rounded-xl p-1 w-fit">
        {(["questoes", "correcao"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? "bg-surface text-foreground shadow-sm" : "text-muted"}`}>
            {t === "questoes" ? "Questões" : `Correção${av.total_pendentes > 0 ? ` (${av.total_pendentes})` : ""}`}
          </button>
        ))}
      </div>

      {/* Tab: Questões */}
      {tab === "questoes" && (
        <div className="space-y-5">
          {/* Lista de questões na avaliação */}
          <div className="space-y-2">
            {av.questoes.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma questão adicionada.</p>
            ) : (
              av.questoes.map((aq, i) => (
                <div key={aq.id} className="flex items-start gap-3 bg-surface border border-border rounded-xl p-3">
                  <span className="text-xs text-muted font-mono w-5 shrink-0 pt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-foreground">{aq.questao.codigo}</span>
                      <span className="text-xs text-muted">{aq.questao.nivel}</span>
                      <span className="text-xs text-muted">{TOPICO_LABELS[aq.questao.topico] ?? aq.questao.topico}</span>
                      <span className="text-xs text-muted">{SUBTIPO_LABELS[aq.questao.subtipo] ?? aq.questao.subtipo}</span>
                      <span className="text-xs font-semibold text-amber-700">Peso {aq.peso}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1 line-clamp-2">{aq.questao.enunciado}</p>
                  </div>
                  {isRascunho && (
                    <button
                      onClick={() => handleRemover(aq.questao_id)}
                      disabled={removendo === aq.questao_id}
                      className="shrink-0 text-rose-500 hover:text-rose-700 disabled:opacity-40"
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Picker de questões — só em rascunho */}
          {isRascunho && (
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-muted uppercase tracking-widest">Adicionar questão</p>

              {/* Filtros */}
              <div className="grid grid-cols-3 gap-2">
                <select
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={filtroNivel}
                  onChange={(e) => setFiltroNivel(e.target.value)}
                >
                  <option value="">Todos os níveis</option>
                  {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <select
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={filtroTopico}
                  onChange={(e) => setFiltroTopico(e.target.value)}
                >
                  <option value="">Todos os tópicos</option>
                  {TOPICOS.map((t) => <option key={t} value={t}>{TOPICO_LABELS[t]}</option>)}
                </select>
                <select
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={filtroDificuldade}
                  onChange={(e) => setFiltroDificuldade(e.target.value)}
                >
                  <option value="">Todas as dificuldades</option>
                  {DIFICULDADES.map((d) => <option key={d} value={d}>{DIFICULDADE_LABELS[d]}</option>)}
                </select>
              </div>

              {/* Busca por código ou texto */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><IconSearch /></span>
                <input
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Código (A3X9KM) ou texto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              {buscando && <p className="text-xs text-muted">Carregando...</p>}

              {!buscando && resultados.length === 0 && (
                <p className="text-xs text-muted">Nenhuma questão encontrada.</p>
              )}

              {resultados.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {resultados.map((q) => {
                    const jaAdicionada = jaAdicionadas.has(q.id);
                    return (
                      <div key={q.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${jaAdicionada ? "opacity-40 border-border bg-background" : "border-border hover:border-primary-300"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-foreground">{q.codigo}</span>
                            <span className="text-xs font-medium text-muted">{q.nivel}</span>
                            <span className="text-xs text-muted">{TOPICO_LABELS[q.topico] ?? q.topico}</span>
                            <span className="text-xs text-muted">{DIFICULDADE_LABELS[q.dificuldade] ?? q.dificuldade}</span>
                          </div>
                          <p className="text-xs text-foreground mt-1 line-clamp-2">{q.enunciado}</p>
                        </div>
                        {jaAdicionada ? (
                          <span className="text-xs text-muted shrink-0 pt-0.5">Adicionada</span>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              className="w-14 text-xs text-center rounded-lg border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="Peso"
                              value={pesoInput[q.id] ?? "1"}
                              onChange={(e) => setPesoInput((p) => ({ ...p, [q.id]: e.target.value }))}
                            />
                            <Button size="sm" loading={adicionando.has(q.id)} onClick={() => handleAdicionar(q)}>
                              Adicionar
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Correção */}
      {tab === "correcao" && (
        <div className="space-y-4">
          {carregandoAlunos ? (
            <div className="flex justify-center h-20 items-center">
              <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
            </div>
          ) : alunos.length === 0 ? (
            <p className="text-sm text-muted">Nenhum aluno respondeu ainda.</p>
          ) : (
            <>
              {/* Lista de alunos */}
              <div className="space-y-2">
                {alunos.map((a) => (
                  <button
                    key={a.aluno_id}
                    onClick={() => handleCarregarRespostas(a.aluno_id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-colors flex items-center justify-between gap-3 ${
                      alunoSel === a.aluno_id
                        ? "border-primary-400 bg-primary-50"
                        : "border-border bg-surface hover:border-primary-300"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{a.nome}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {STATUS_ALUNO_LABELS[a.status] ?? a.status}
                        {a.nota_final != null && ` · Nota: ${a.nota_final}`}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      a.status === "concluida"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {a.status === "concluida" ? "Concluída" : "Pendente"}
                    </span>
                  </button>
                ))}
              </div>

              {/* Respostas do aluno selecionado */}
              {alunoSel && respostas.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-xs font-bold text-muted uppercase tracking-widest">
                    Respostas de {alunos.find((a) => a.aluno_id === alunoSel)?.nome}
                  </p>
                  {respostas.map((r) => (
                    <div key={r.questao_id} className="bg-surface border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-2 justify-between">
                        <div>
                          <span className="text-xs font-mono text-foreground">{r.codigo}</span>
                          <span className="ml-2 text-xs text-muted">{SUBTIPO_LABELS[r.subtipo] ?? r.subtipo} · peso {r.peso}</span>
                        </div>
                        {r.corrigida && (
                          <span className="text-xs font-semibold text-emerald-600">Corrigida ✓</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{r.enunciado}</p>
                      <div className="bg-background border border-border rounded-lg p-3">
                        <p className="text-xs text-muted mb-1">Resposta do aluno:</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{r.resposta_dada || "—"}</p>
                      </div>
                      {r.acertou === null && !r.corrigida && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Field label="Nota (0–10)">
                              <input
                                type="number" min="0" max="10" step="0.5"
                                className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={notaInputs[r.questao_id] ?? ""}
                                onChange={(e) => setNotaInputs((p) => ({ ...p, [r.questao_id]: e.target.value }))}
                              />
                            </Field>
                          </div>
                          <Field label="Comentário (opcional)">
                            <textarea
                              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                              rows={2}
                              value={comentInputs[r.questao_id] ?? ""}
                              onChange={(e) => setComentInputs((p) => ({ ...p, [r.questao_id]: e.target.value }))}
                              placeholder="Feedback para o aluno..."
                            />
                          </Field>
                          <Button size="sm" loading={corrigindo === r.questao_id} onClick={() => handleCorrigir(r)}>
                            Salvar correção
                          </Button>
                        </div>
                      )}
                      {r.acertou !== null && (
                        <p className={`text-xs font-semibold ${r.acertou ? "text-emerald-600" : "text-rose-600"}`}>
                          {r.acertou ? "✓ Correto" : "✗ Incorreto"}
                          {r.nota_manual != null && ` · Nota: ${Math.round(r.nota_manual * 10)}/10`}
                        </p>
                      )}
                      {r.corrigida && r.acertou === null && r.nota_manual != null && (
                        <p className="text-xs font-semibold text-primary-600">
                          Nota: {Math.round(r.nota_manual * 10)}/10
                        </p>
                      )}
                      {r.comentario_professor && (
                        <p className="text-xs text-muted italic">"{r.comentario_professor}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {/* Modal editar metadados */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setShowEdit(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground">Editar avaliação</h2>
            <form onSubmit={handleSalvarEdit} className="space-y-4">
              <Field label="Título *">
                <Input
                  value={editForm.titulo}
                  onChange={(e) => setEditForm((p) => ({ ...p, titulo: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Módulo">
                <Input
                  value={editForm.modulo}
                  onChange={(e) => setEditForm((p) => ({ ...p, modulo: e.target.value }))}
                  placeholder="Ex: Módulo 2, Unit 3 (opcional)"
                />
              </Field>
              <Field label="Descrição">
                <textarea
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={2}
                  value={editForm.descricao}
                  onChange={(e) => setEditForm((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Contexto pedagógico (opcional)"
                />
              </Field>
              <Field label="Aula vinculada (opcional)">
                {aulasOpcoes.length > 0 ? (
                  <Select
                    options={[
                      { value: "", label: "Nenhuma" },
                      ...aulasOpcoes.map((a) => ({
                        value: String(a.id),
                        label: `${new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")} · ${a.hora_inicio.slice(0, 5)}–${a.hora_fim.slice(0, 5)}${a.descricao ? ` · ${a.descricao}` : ""}`,
                      })),
                    ]}
                    value={editForm.aula_id}
                    onChange={(e) => {
                      const aula = aulasOpcoes.find((a) => String(a.id) === e.target.value);
                      setEditForm((p) => ({
                        ...p,
                        aula_id: e.target.value,
                        data_aplicacao: aula ? aula.data : p.data_aplicacao,
                        hora_inicio: aula ? aula.hora_inicio.slice(0, 5) : p.hora_inicio,
                        hora_fim: aula ? aula.hora_fim.slice(0, 5) : p.hora_fim,
                      }));
                    }}
                  />
                ) : (
                  <p className="text-xs text-muted py-1">
                    Nenhuma aula agendada para esta turma. Crie uma aula em{" "}
                    <a href="/admin/aulas" className="text-primary-600 hover:underline">Aulas</a>{" "}
                    se a avaliação ocorrer durante uma aula agendada.
                  </p>
                )}
              </Field>
              <Field label="Data de aplicação">
                <Input
                  type="date"
                  value={editForm.data_aplicacao}
                  onChange={(e) => setEditForm((p) => ({ ...p, data_aplicacao: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Início">
                  <Input
                    type="time"
                    value={editForm.hora_inicio}
                    onChange={(e) => setEditForm((p) => ({ ...p, hora_inicio: e.target.value }))}
                  />
                </Field>
                <Field label="Término">
                  <Input
                    type="time"
                    value={editForm.hora_fim}
                    onChange={(e) => setEditForm((p) => ({ ...p, hora_fim: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <Button type="button" variant="outline" onClick={() => setShowEdit(false)} disabled={salvandoEdit}>Cancelar</Button>
                <Button type="submit" loading={salvandoEdit}>Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
