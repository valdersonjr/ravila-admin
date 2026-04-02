"use client";
import { useEffect, useState } from "react";
import {
  questoesService,
  type Questao,
  type QuestaoCreate,
  NIVEIS,
  SUBTIPOS,
  CONTEXTOS,
  TOPICOS,
  DIFICULDADES,
  CONTEXTO_LABELS,
  SUBTIPO_LABELS,
  TOPICO_LABELS,
  DIFICULDADE_LABELS,
} from "@/services/admin/questoes";
import { getErrorMessage } from "@/lib/utils";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";

const ALL_OPTION = { value: "", label: "Todos" };

const nivelOptions = [ALL_OPTION, ...NIVEIS.map((n) => ({ value: n, label: n }))];
const subtipoOptions = [ALL_OPTION, ...SUBTIPOS.map((s) => ({ value: s, label: SUBTIPO_LABELS[s] }))];
const contextoOptions = [ALL_OPTION, ...CONTEXTOS.map((c) => ({ value: c, label: CONTEXTO_LABELS[c] }))];
const topicoOptions = [ALL_OPTION, ...TOPICOS.map((t) => ({ value: t, label: TOPICO_LABELS[t] }))];
const dificuldadeOptions = [ALL_OPTION, ...DIFICULDADES.map((d) => ({ value: d, label: DIFICULDADE_LABELS[d] }))];

const nivelFormOptions = NIVEIS.map((n) => ({ value: n, label: n }));
const subtipoFormOptions = SUBTIPOS.map((s) => ({ value: s, label: SUBTIPO_LABELS[s] }));
const contextoFormOptions = CONTEXTOS.map((c) => ({ value: c, label: CONTEXTO_LABELS[c] }));
const topicoFormOptions = TOPICOS.map((t) => ({ value: t, label: TOPICO_LABELS[t] }));
const dificuldadeFormOptions = DIFICULDADES.map((d) => ({ value: d, label: DIFICULDADE_LABELS[d] }));
const midiaTipoFormOptions = [
  { value: "", label: "Não especificado" },
  { value: "image", label: "Imagem" },
  { value: "audio", label: "Áudio" },
  { value: "video", label: "Vídeo" },
];

const EMPTY_FORM: QuestaoCreate = {
  enunciado: "",
  nivel: "A1",
  subtipo: "multiple_choice",
  contexto: "casual",
  topico: "grammar",
  dificuldade: "medium",
  texto_apoio: "",
  midia_url: "",
  midia_tipo: "",
  alternativas: ["", "", "", ""],
  resposta_correta: "",
  explicacao: "",
};

export default function QuestoesPage() {
  const { showToast } = useToast();

  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 20;

  const [filterNivel, setFilterNivel] = useState("");
  const [filterSubtipo, setFilterSubtipo] = useState("");
  const [filterContexto, setFilterContexto] = useState("");
  const [filterTopico, setFilterTopico] = useState("");
  const [filterDificuldade, setFilterDificuldade] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Questao | null>(null);
  const [form, setForm] = useState<QuestaoCreate>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deletando, setDeletando] = useState<Questao | null>(null);
  const [confirmandoDelete, setConfirmandoDelete] = useState(false);

  async function load(overridePage?: number) {
    setLoading(true);
    const p = overridePage ?? page;
    try {
      const result = await questoesService.listar({
        nivel: filterNivel || undefined,
        subtipo: filterSubtipo || undefined,
        contexto: filterContexto || undefined,
        topico: filterTopico || undefined,
        dificuldade: filterDificuldade || undefined,
        page: p,
        page_size: PAGE_SIZE,
      });
      setQuestoes(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao carregar questões."), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function abrirCriar() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function abrirEditar(q: Questao) {
    setEditando(q);
    setForm({
      enunciado: q.enunciado,
      nivel: q.nivel,
      subtipo: q.subtipo,
      contexto: q.contexto,
      topico: q.topico,
      dificuldade: q.dificuldade,
      texto_apoio: q.texto_apoio ?? "",
      midia_url: q.midia_url ?? "",
      midia_tipo: q.midia_tipo ?? "",
      alternativas: q.alternativas ?? ["", "", "", ""],
      resposta_correta: q.resposta_correta,
      explicacao: q.explicacao ?? "",
    });
    setShowForm(true);
  }

  function fecharForm() {
    setShowForm(false);
    setEditando(null);
  }

  function addAlternativa() {
    setForm((p) => ({ ...p, alternativas: [...(p.alternativas ?? []), ""] }));
  }

  function removeAlternativa(index: number) {
    setForm((p) => {
      const alts = (p.alternativas ?? []).filter((_, i) => i !== index);
      const respostaCorreta = p.resposta_correta === (p.alternativas ?? [])[index] ? "" : p.resposta_correta;
      return { ...p, alternativas: alts, resposta_correta: respostaCorreta };
    });
  }

  function setAlternativa(index: number, value: string) {
    setForm((p) => {
      const alts = [...(p.alternativas ?? [])];
      const eraCorreta = p.resposta_correta === alts[index];
      alts[index] = value;
      return { ...p, alternativas: alts, resposta_correta: eraCorreta ? value : p.resposta_correta };
    });
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    const payload: QuestaoCreate = {
      ...form,
      texto_apoio: form.texto_apoio?.trim() || undefined,
      midia_url: form.midia_url?.trim() || undefined,
      midia_tipo: form.midia_tipo?.trim() || undefined,
      explicacao: form.explicacao?.trim() || undefined,
      alternativas: form.subtipo === "multiple_choice" ? form.alternativas : undefined,
    };

    if (form.subtipo === "multiple_choice") {
      const alts = (payload.alternativas ?? []).filter(Boolean);
      if (alts.length < 2) { showToast("Informe pelo menos 2 alternativas.", "error"); return; }
      if (!alts.includes(form.resposta_correta)) { showToast("A resposta correta deve ser uma das alternativas.", "error"); return; }
    }
    if (!form.resposta_correta.trim()) { showToast("Informe a resposta correta.", "error"); return; }

    setSaving(true);
    try {
      if (editando) {
        const updated = await questoesService.atualizar(editando.id, payload);
        setQuestoes((prev) => prev.map((q) => q.id === updated.id ? updated : q));
        showToast("Questão atualizada!");
      } else {
        const nova = await questoesService.criar(payload);
        setQuestoes((prev) => [nova, ...prev]);
        showToast("Questão criada!");
      }
      fecharForm();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao salvar questão."), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletar() {
    if (!deletando) return;
    setConfirmandoDelete(true);
    try {
      await questoesService.deletar(deletando.id);
      setQuestoes((prev) => prev.filter((q) => q.id !== deletando.id));
      showToast("Questão desativada.");
      setDeletando(null);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao desativar questão."), "error");
    } finally {
      setConfirmandoDelete(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Banco de Questões</h1>
        <Button onClick={abrirCriar}>+ Nova questão</Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end bg-surface border border-border rounded-xl p-4">
        <div className="w-28">
          <label className="block text-xs text-muted mb-1">Nível</label>
          <Select options={nivelOptions} value={filterNivel} onChange={(e) => setFilterNivel(e.target.value)} />
        </div>
        <div className="w-44">
          <label className="block text-xs text-muted mb-1">Subtipo</label>
          <Select options={subtipoOptions} value={filterSubtipo} onChange={(e) => setFilterSubtipo(e.target.value)} />
        </div>
        <div className="w-44">
          <label className="block text-xs text-muted mb-1">Tópico</label>
          <Select options={topicoOptions} value={filterTopico} onChange={(e) => setFilterTopico(e.target.value)} />
        </div>
        <div className="w-36">
          <label className="block text-xs text-muted mb-1">Dificuldade</label>
          <Select options={dificuldadeOptions} value={filterDificuldade} onChange={(e) => setFilterDificuldade(e.target.value)} />
        </div>
        <div className="w-44">
          <label className="block text-xs text-muted mb-1">Contexto</label>
          <Select options={contextoOptions} value={filterContexto} onChange={(e) => setFilterContexto(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => { setPage(1); load(1); }}>Filtrar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center">
          <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
        <Table<Questao>
          keyExtractor={(q) => q.id}
          data={questoes}
          emptyMessage="Nenhuma questão cadastrada."
          columns={[
            {
              header: "Código",
              render: (q) => (
                <span className="font-mono text-xs text-foreground">{q.codigo}</span>
              ),
            },
            {
              header: "Enunciado",
              render: (q) => (
                <span className="block max-w-xs truncate text-sm" title={q.enunciado}>
                  {q.enunciado}
                </span>
              ),
            },
            {
              header: "Nível",
              render: (q) => (
                <span className="px-2 py-0.5 rounded-md bg-primary-100 text-primary-700 text-xs font-bold">
                  {q.nivel}
                </span>
              ),
            },
            { header: "Subtipo", render: (q) => SUBTIPO_LABELS[q.subtipo] ?? q.subtipo },
            { header: "Tópico", render: (q) => TOPICO_LABELS[q.topico] ?? q.topico },
            {
              header: "Dificuldade",
              render: (q) => {
                const cls = q.dificuldade === "easy"
                  ? "bg-emerald-100 text-emerald-700"
                  : q.dificuldade === "hard"
                  ? "bg-rose-100 text-rose-600"
                  : "bg-amber-100 text-amber-700";
                return (
                  <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${cls}`}>
                    {DIFICULDADE_LABELS[q.dificuldade] ?? q.dificuldade}
                  </span>
                );
              },
            },
            {
              header: "Ações",
              render: (q) => (
                <div className="flex gap-3">
                  <button onClick={() => abrirEditar(q)} className="text-xs text-primary-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => setDeletando(q)} className="text-xs text-rose-600 hover:underline">
                    Desativar
                  </button>
                </div>
              ),
            },
          ]}
        />
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{total} questão{total !== 1 ? "es" : ""}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { const p = page - 1; setPage(p); load(p); }} disabled={page <= 1}>
              ← Anterior
            </Button>
            <span className="text-foreground">Página {page} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <Button variant="outline" size="sm" onClick={() => { const p = page + 1; setPage(p); load(p); }} disabled={page >= Math.ceil(total / PAGE_SIZE)}>
              Próxima →
            </Button>
          </div>
        </div>
        </>
      )}

      {/* Modal criar/editar */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={fecharForm} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground">
              {editando ? "Editar questão" : "Nova questão"}
            </h2>

            <form onSubmit={handleSalvar} className="space-y-4">

              {/* Classificação */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="Nível *">
                  <Select options={nivelFormOptions} value={form.nivel}
                    onChange={(e) => setForm((p) => ({ ...p, nivel: e.target.value }))} />
                </Field>
                <Field label="Subtipo *">
                  <Select options={subtipoFormOptions} value={form.subtipo}
                    onChange={(e) => setForm((p) => ({
                      ...p,
                      subtipo: e.target.value,
                      alternativas: e.target.value === "multiple_choice" ? ["", "", "", ""] : undefined,
                      resposta_correta: "",
                    }))} />
                </Field>
                <Field label="Tópico *">
                  <Select options={topicoFormOptions} value={form.topico}
                    onChange={(e) => setForm((p) => ({ ...p, topico: e.target.value }))} />
                </Field>
                <Field label="Dificuldade *">
                  <Select options={dificuldadeFormOptions} value={form.dificuldade}
                    onChange={(e) => setForm((p) => ({ ...p, dificuldade: e.target.value }))} />
                </Field>
                <Field label="Contexto *">
                  <Select options={contextoFormOptions} value={form.contexto}
                    onChange={(e) => setForm((p) => ({ ...p, contexto: e.target.value }))} />
                </Field>
              </div>

              {/* Texto de apoio */}
              <Field label="Texto de apoio">
                <textarea
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={4}
                  value={form.texto_apoio ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, texto_apoio: e.target.value }))}
                  placeholder="Cole aqui o trecho, charge ou contexto da questão (opcional)"
                />
              </Field>

              {/* URL de mídia */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="URL de mídia">
                    <Input
                      value={form.midia_url ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, midia_url: e.target.value }))}
                      placeholder="https://... (opcional)"
                    />
                  </Field>
                  <Field label="Tipo de mídia">
                    <Select
                      options={midiaTipoFormOptions}
                      value={form.midia_tipo ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, midia_tipo: e.target.value }))}
                    />
                  </Field>
                </div>
                {form.midia_url?.trim() && form.midia_tipo === "image" && (
                  <img
                    src={form.midia_url}
                    alt="preview"
                    className="rounded-lg border border-border max-h-40 object-contain"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              {/* Enunciado */}
              <Field label="Enunciado / Pergunta *">
                <textarea
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  value={form.enunciado}
                  onChange={(e) => setForm((p) => ({ ...p, enunciado: e.target.value }))}
                  placeholder={form.subtipo === "fill_blanks" ? "Ex: She ___ to school every day." : "Ex: According to the text, mice and humans..."}
                  required
                />
              </Field>

              {/* Alternativas dinâmicas */}
              {form.subtipo === "multiple_choice" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted">Alternativas — marque o radio ao lado da correta</p>
                  {(form.alternativas ?? []).map((alt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="resposta_correta"
                        value={alt}
                        checked={form.resposta_correta === alt && alt !== ""}
                        onChange={() => setForm((p) => ({ ...p, resposta_correta: alt }))}
                        className="accent-primary-600 shrink-0"
                      />
                      <Input
                        value={alt}
                        onChange={(e) => setAlternativa(i, e.target.value)}
                        placeholder={`Alternativa ${i + 1}`}
                        className="flex-1"
                      />
                      {(form.alternativas ?? []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeAlternativa(i)}
                          className="text-rose-500 hover:text-rose-700 text-lg leading-none shrink-0"
                          title="Remover"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {(form.alternativas ?? []).length < 6 && (
                    <button
                      type="button"
                      onClick={addAlternativa}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      + Adicionar alternativa
                    </button>
                  )}
                </div>
              )}

              {/* Resposta correta para fill_blanks */}
              {form.subtipo === "fill_blanks" && (
                <Field label="Resposta correta *">
                  <Input
                    value={form.resposta_correta}
                    onChange={(e) => setForm((p) => ({ ...p, resposta_correta: e.target.value }))}
                    placeholder="Ex: goes (separe variações aceitas com |)"
                    required
                  />
                  <p className="text-[11px] text-muted mt-1">Use | para múltiplas respostas aceitas. Ex: goes|walk to school</p>
                </Field>
              )}

              {/* Explicação */}
              <Field label="Explicação">
                <textarea
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  value={form.explicacao ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, explicacao: e.target.value }))}
                  placeholder="Ex: O texto afirma que humanos e outros mamíferos possuem a mesma via metabólica para produzir morfina."
                />
                <p className="text-[11px] text-muted mt-1">Exibida ao aluno após responder, independente de acerto ou erro.</p>
              </Field>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={fecharForm} disabled={saving}>Cancelar</Button>
                <Button type="submit" loading={saving}>Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletando && (
        <Modal
          title="Desativar questão"
          message={`Desativar "${deletando.enunciado.slice(0, 60)}..."? Ela não aparecerá mais para os alunos.`}
          confirmLabel="Desativar"
          onConfirm={handleDeletar}
          onClose={() => setDeletando(null)}
          loading={confirmandoDelete}
        />
      )}
    </div>
  );
}
