"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { avaliacoesService, type AvaliacaoList, type AvaliacaoCreate, STATUS_LABELS, STATUS_COLORS } from "@/services/admin/avaliacoes";
import { Modal } from "@/components/ui/Modal";
import { TOPICOS, TOPICO_LABELS } from "@/services/admin/questoes";
import { turmasService, type Turma } from "@/services/admin/turmas";
import { professoresService, type Professor } from "@/services/admin/professores";
import { aulasService, type Aula } from "@/services/admin/aulas";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Combobox } from "@/components/ui/Combobox";
import { useToast } from "@/context/ToastContext";
import { authService } from "@/services/auth";

const ALL = { value: "", label: "Todos" };
const statusOptions = [ALL, ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))];
const topicoOptions = [ALL, ...TOPICOS.map((t) => ({ value: t, label: TOPICO_LABELS[t] }))];

const EMPTY: AvaliacaoCreate = {
  titulo: "",
  topicos: [],
  modulo: "",
  descricao: "",
  tipo: "online",
  turma_id: 0,
  data_aplicacao: "",
};

const EMPTY_OFFLINE: AvaliacaoCreate = { ...EMPTY, tipo: "offline" };

export default function AvaliacoesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const isAdmin = ["admin", "secretario"].includes(authService.getRole() ?? "");

  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoList[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterTopico, setFilterTopico] = useState("");
  const [filterTurmaId, setFilterTurmaId] = useState<number | string | null>(null);
  const [filterProfessorId, setFilterProfessorId] = useState<number | string | null>(null);
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loadingOpcoes, setLoadingOpcoes] = useState(true);

  const [aulasOpcoes, setAulasOpcoes] = useState<Aula[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AvaliacaoCreate>(EMPTY);
  const [saving, setSaving] = useState(false);

  const [docFile, setDocFile] = useState<File | null>(null);

  const [excluindo, setExcluindo] = useState<AvaliacaoList | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  // Carrega opções de filtro uma única vez
  useEffect(() => {
    const promises: Promise<unknown>[] = [turmasService.listar({ page_size: 500 })];
    if (isAdmin) promises.push(professoresService.listar());
    Promise.all(promises)
      .then(([t, p]) => {
        setTurmas((t as Awaited<ReturnType<typeof turmasService.listar>>).items ?? []);
        if (p) setProfessores(p as Professor[]);
      })
      .finally(() => setLoadingOpcoes(false));
  }, []);

  // Auto-filtra sempre que qualquer filtro mudar
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    avaliacoesService.listar({
      status: filterStatus || undefined,
      topico: filterTopico || undefined,
      turma_id: filterTurmaId ? Number(filterTurmaId) : undefined,
      professor_id: filterProfessorId ? Number(filterProfessorId) : undefined,
      data_inicio: filterDataInicio || undefined,
      data_fim: filterDataFim || undefined,
      page_size: 100,
    }).then((items) => {
      if (!cancelled) setAvaliacoes(items);
    }).catch((err) => {
      if (!cancelled) showToast(getErrorMessage(err, "Erro ao carregar avaliações."), "error");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [filterStatus, filterTopico, filterTurmaId, filterProfessorId, filterDataInicio, filterDataFim]);

  // Busca aulas da turma selecionada no form
  useEffect(() => {
    if (!form.turma_id) { setAulasOpcoes([]); return; }
    aulasService.listar({ turma_id: form.turma_id, page_size: 50 })
      .then((r) => setAulasOpcoes(r.items ?? []))
      .catch(() => setAulasOpcoes([]));
  }, [form.turma_id]);

  // Filtros ativos como chips removíveis
  const activeFilters = [
    filterStatus && {
      key: "status", label: `Status: ${STATUS_LABELS[filterStatus]}`,
      clear: () => setFilterStatus(""),
    },
    filterTopico && {
      key: "topico", label: `Tópico: ${TOPICO_LABELS[filterTopico] ?? filterTopico}`,
      clear: () => setFilterTopico(""),
    },
    filterTurmaId && {
      key: "turma", label: `Turma: ${turmas.find((t) => t.id === Number(filterTurmaId))?.nome ?? filterTurmaId}`,
      clear: () => setFilterTurmaId(null),
    },
    filterProfessorId && {
      key: "professor", label: `Professor: ${professores.find((p) => p.pessoa_id === Number(filterProfessorId))?.pessoa.nome ?? filterProfessorId}`,
      clear: () => setFilterProfessorId(null),
    },
    filterDataInicio && {
      key: "de", label: `De: ${new Date(filterDataInicio + "T00:00:00").toLocaleDateString("pt-BR")}`,
      clear: () => setFilterDataInicio(""),
    },
    filterDataFim && {
      key: "ate", label: `Até: ${new Date(filterDataFim + "T00:00:00").toLocaleDateString("pt-BR")}`,
      clear: () => setFilterDataFim(""),
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  function clearAllFilters() {
    setFilterStatus("");
    setFilterTopico("");
    setFilterTurmaId(null);
    setFilterProfessorId(null);
    setFilterDataInicio("");
    setFilterDataFim("");
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.turma_id) { showToast("Selecione a turma.", "error"); return; }
    if (!form.topicos.length) { showToast("Selecione pelo menos um tópico.", "error"); return; }
    setSaving(true);
    try {
      const nova = await avaliacoesService.criar({
        ...form,
        modulo: form.modulo?.trim() || undefined,
        descricao: form.descricao?.trim() || undefined,
        data_aplicacao: form.data_aplicacao?.trim() || undefined,
      });
      if (form.tipo === "offline" && docFile) {
        try {
          await avaliacoesService.uploadDocumento(nova.id, docFile);
        } catch {
          showToast("Avaliação criada, mas o upload do documento falhou. Tente novamente na página de detalhe.", "error");
        }
      }
      setShowForm(false);
      setDocFile(null);
      router.push(`/admin/avaliacoes/${nova.id}`);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar avaliação."), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir() {
    if (!excluindo) return;
    setConfirmandoExclusao(true);
    try {
      await avaliacoesService.deletar(excluindo.id);
      setAvaliacoes((prev) => prev.filter((a) => a.id !== excluindo.id));
      showToast("Avaliação excluída.");
      setExcluindo(null);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao excluir avaliação."), "error");
    } finally {
      setConfirmandoExclusao(false);
    }
  }

  const hasFilters = activeFilters.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avaliações</h1>
          {!loading && (
            <p className="text-sm text-muted mt-0.5">
              {avaliacoes.length} avaliação{avaliacoes.length !== 1 ? "ões" : ""}
              {hasFilters ? " encontrada" + (avaliacoes.length !== 1 ? "s" : "") : " no total"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setForm(EMPTY_OFFLINE); setShowForm(true); }}>
            + Registrar prova externa
          </Button>
          <Button onClick={() => { setForm(EMPTY); setShowForm(true); }}>+ Criar avaliação online</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-40">
            <label className="block text-xs text-muted mb-1">Status</label>
            <Select options={statusOptions} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} />
          </div>
          <div className="w-44">
            <label className="block text-xs text-muted mb-1">Tópico</label>
            <Select options={topicoOptions} value={filterTopico} onChange={(e) => setFilterTopico(e.target.value)} />
          </div>
          <div className="w-52">
            <label className="block text-xs text-muted mb-1">Turma</label>
            <Combobox
              options={turmas.map((t) => ({ value: t.id, label: t.nome }))}
              value={filterTurmaId}
              onChange={setFilterTurmaId}
              placeholder="Todas as turmas"
              loading={loadingOpcoes}
            />
          </div>
          {isAdmin && (
            <div className="w-52">
              <label className="block text-xs text-muted mb-1">Professor</label>
              <Combobox
                options={professores.map((p) => ({ value: p.pessoa_id, label: p.pessoa.nome }))}
                value={filterProfessorId}
                onChange={setFilterProfessorId}
                placeholder="Todos os professores"
                loading={loadingOpcoes}
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-muted mb-1">De</label>
            <Input type="date" value={filterDataInicio} onChange={(e) => setFilterDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Até</label>
            <Input type="date" value={filterDataFim} onChange={(e) => setFilterDataFim(e.target.value)} />
          </div>
        </div>

        {/* Chips de filtros ativos */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 border border-primary-200 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {f.label}
                <button onClick={f.clear} className="ml-0.5 hover:text-primary-900 leading-none" aria-label="Remover filtro">
                  ×
                </button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="text-xs text-muted hover:text-foreground underline ml-1">
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center h-20 items-center">
          <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : avaliacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-foreground font-medium">
            {hasFilters ? "Nenhuma avaliação corresponde aos filtros aplicados" : "Nenhuma avaliação criada ainda"}
          </p>
          <p className="text-sm text-muted mt-1">
            {hasFilters
              ? "Tente ajustar ou limpar os filtros."
              : "Clique em \"+ Nova avaliação\" para começar."}
          </p>
          {hasFilters && (
            <button onClick={clearAllFilters} className="mt-3 text-sm text-primary-600 hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {avaliacoes.map((av) => (
            <div
              key={av.id}
              className="group bg-surface border border-border rounded-xl p-4 hover:border-primary-300 transition-colors cursor-pointer"
              onClick={() => router.push(`/admin/avaliacoes/${av.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{av.titulo}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[av.status]}`}>
                      {STATUS_LABELS[av.status]}
                    </span>
                    {av.tipo === "offline" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                        offline
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                    <span>{(av.topicos ?? []).map((t) => TOPICO_LABELS[t] ?? t).join(", ")}</span>
                    {av.modulo && <span>· {av.modulo}</span>}
                    {av.turma_nome && <span>· {av.turma_nome}</span>}
                    {av.data_aplicacao && (
                      <span>· {new Date(av.data_aplicacao + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right text-xs text-muted hidden sm:block">
                    {av.tipo === "offline" ? (
                      <p>{av.total_alunos} nota{av.total_alunos !== 1 ? "s" : ""} lançada{av.total_alunos !== 1 ? "s" : ""}</p>
                    ) : (
                      <>
                        <p>{av.total_questoes} questão{av.total_questoes !== 1 ? "ões" : ""}</p>
                        <p>{av.total_alunos} aluno{av.total_alunos !== 1 ? "s" : ""}</p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExcluindo(av); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => { setShowForm(false); setDocFile(null); }} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground">
              {form.tipo === "offline" ? "Registrar prova externa" : "Criar avaliação online"}
            </h2>

            {form.tipo === "offline" && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 text-xs text-violet-800">
                Avaliação offline: o professor lança as notas manualmente após a publicação.
              </div>
            )}

            <form onSubmit={handleCriar} className="space-y-4">
              <Field label="Título *">
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  required
                  placeholder="Ex: Avaliação de Reading"
                  autoFocus
                />
              </Field>
              <Field label="Tópicos *">
                <div className="flex flex-wrap gap-2 pt-1">
                  {TOPICOS.map((t) => {
                    const active = form.topicos.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((p) => ({
                          ...p,
                          topicos: active ? p.topicos.filter((x) => x !== t) : [...p.topicos, t],
                        }))}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? "bg-primary-600 text-white border-primary-600"
                            : "bg-surface text-muted border-border hover:border-primary-400"
                        }`}
                      >
                        {TOPICO_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Turma *">
                <Select
                  options={[{ value: "", label: "Selecione" }, ...turmas.map((t) => ({ value: String(t.id), label: t.nome }))]}
                  value={form.turma_id ? String(form.turma_id) : ""}
                  onChange={(e) => setForm((p) => ({ ...p, turma_id: Number(e.target.value), aula_id: undefined }))}
                />
              </Field>
              {form.tipo === "online" && form.turma_id > 0 && (
                <Field label="Aula vinculada (opcional)">
                  {aulasOpcoes.length > 0 ? (
                    <Select
                      options={[
                        { value: "", label: "Nenhuma" },
                        ...aulasOpcoes.map((a) => ({
                          value: String(a.id),
                          label: `${new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")} · ${a.hora_inicio.slice(0, 5)}–${a.hora_fim.slice(0, 5)}`,
                        })),
                      ]}
                      value={form.aula_id ? String(form.aula_id) : ""}
                      onChange={(e) => {
                        const aula = aulasOpcoes.find((a) => String(a.id) === e.target.value);
                        setForm((p) => ({
                          ...p,
                          aula_id: aula ? aula.id : undefined,
                          data_aplicacao: aula ? aula.data : p.data_aplicacao,
                        }));
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted py-1">Nenhuma aula agendada para esta turma.</p>
                  )}
                </Field>
              )}
              <Field label="Data de aplicação">
                <Input
                  type="date"
                  value={form.data_aplicacao ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, data_aplicacao: e.target.value }))}
                />
              </Field>
              <Field label="Módulo">
                <Input
                  value={form.modulo ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, modulo: e.target.value }))}
                  placeholder="Ex: Unit 3 (opcional)"
                />
              </Field>
              <Field label="Descrição">
                <textarea
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={2}
                  value={form.descricao ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Contexto pedagógico (opcional)"
                />
              </Field>
              {form.tipo === "offline" && (
                <Field label="Documento da prova (opcional)">
                  <div className="space-y-1">
                    <label className={`cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors ${saving ? "opacity-50 pointer-events-none" : ""}`}>
                      {docFile ? docFile.name : "Selecionar PDF ou imagem"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                        className="hidden"
                        disabled={saving}
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (f && f.size > 200 * 1024 * 1024) {
                            showToast("Arquivo muito grande. Máximo 200 MB.", "error");
                            e.target.value = "";
                            return;
                          }
                          setDocFile(f);
                        }}
                      />
                    </label>
                    {docFile && (
                      <button type="button" onClick={() => setDocFile(null)} className="text-xs text-muted hover:text-rose-500 transition-colors">
                        Remover
                      </button>
                    )}
                    <p className="text-xs text-muted">PDF, JPG, PNG ou WebP. Máx. 200 MB.</p>
                  </div>
                </Field>
              )}
              <p className="text-xs text-muted">
                {form.tipo === "offline"
                  ? "Após publicar, acesse o detalhe para lançar as notas por aluno."
                  : "As questões são configuradas na página de detalhe."}
              </p>
              <div className="flex gap-3 justify-end pt-1">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setDocFile(null); }} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" loading={saving}>
                  {form.tipo === "offline" ? "Criar avaliação" : "Criar e configurar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {excluindo && (
        <Modal
          title="Excluir avaliação"
          message={`Excluir "${excluindo.titulo}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={handleExcluir}
          onClose={() => setExcluindo(null)}
          loading={confirmandoExclusao}
        />
      )}
    </div>
  );
}
