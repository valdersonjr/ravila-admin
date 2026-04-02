"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { avaliacoesService, type AvaliacaoList, type AvaliacaoCreate, STATUS_LABELS, STATUS_COLORS } from "@/services/admin/avaliacoes";
import { TOPICOS, TOPICO_LABELS } from "@/services/admin/questoes";
import { turmasService } from "@/services/admin/turmas";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";

const ALL = { value: "", label: "Todos" };
const statusOptions = [ALL, ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))];
const topicoOptions = [ALL, ...TOPICOS.map((t) => ({ value: t, label: TOPICO_LABELS[t] }))];
const topicoFormOptions = TOPICOS.map((t) => ({ value: t, label: TOPICO_LABELS[t] }));

const EMPTY: AvaliacaoCreate = {
  titulo: "",
  topicos: [],
  modulo: "",
  descricao: "",
  turma_id: 0,
  data_aplicacao: "",
  hora_inicio: "",
  hora_fim: "",
};

export default function AvaliacoesPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTopico, setFilterTopico] = useState("");

  const [turmas, setTurmas] = useState<{ value: string; label: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AvaliacaoCreate>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const items = await avaliacoesService.listar({
        status: filterStatus || undefined,
        topico: filterTopico || undefined,
      });
      setAvaliacoes(items);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao carregar avaliações."), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    turmasService.listar({ page_size: 100 }).then((r) =>
      setTurmas((r.items ?? []).map((t: any) => ({ value: String(t.id), label: t.nome })))
    ).catch(() => {});
  }, []);

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
        hora_inicio: form.hora_inicio?.trim() || undefined,
        hora_fim: form.hora_fim?.trim() || undefined,
      });
      setShowForm(false);
      router.push(`/admin/avaliacoes/${nova.id}`);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar avaliação."), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Avaliações</h1>
        <Button onClick={() => { setForm(EMPTY); setShowForm(true); }}>+ Nova avaliação</Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end bg-surface border border-border rounded-xl p-4">
        <div className="w-40">
          <label className="block text-xs text-muted mb-1">Status</label>
          <Select options={statusOptions} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} />
        </div>
        <div className="w-44">
          <label className="block text-xs text-muted mb-1">Tópico</label>
          <Select options={topicoOptions} value={filterTopico} onChange={(e) => setFilterTopico(e.target.value)} />
        </div>
        <Button variant="outline" onClick={load}>Filtrar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center">
          <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : avaliacoes.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma avaliação encontrada.</p>
      ) : (
        <div className="space-y-3">
          {avaliacoes.map((av) => (
            <button
              key={av.id}
              onClick={() => router.push(`/admin/avaliacoes/${av.id}`)}
              className="w-full text-left bg-surface border border-border rounded-xl p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{av.titulo}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[av.status]}`}>
                      {STATUS_LABELS[av.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                    <span>{(av.topicos ?? []).map((t) => TOPICO_LABELS[t] ?? t).join(", ")}</span>
                    {av.modulo && <span>· {av.modulo}</span>}
                    {av.turma_nome && <span>· {av.turma_nome}</span>}
                    {av.data_aplicacao && <span>· {new Date(av.data_aplicacao + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                  </div>
                </div>
                <div className="text-right text-xs text-muted shrink-0">
                  <p>{av.total_questoes} questão{av.total_questoes !== 1 ? "ões" : ""}</p>
                  <p>{av.total_alunos} aluno{av.total_alunos !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal criar */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Nova avaliação</h2>
            <form onSubmit={handleCriar} className="space-y-4">
              <Field label="Título *">
                <Input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} required placeholder="Ex: Avaliação de Reading" />
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
                          topicos: active
                            ? p.topicos.filter((x) => x !== t)
                            : [...p.topicos, t],
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
                  options={[{ value: "", label: "Selecione" }, ...turmas]}
                  value={form.turma_id ? String(form.turma_id) : ""}
                  onChange={(e) => setForm((p) => ({ ...p, turma_id: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Módulo">
                <Input value={form.modulo ?? ""} onChange={(e) => setForm((p) => ({ ...p, modulo: e.target.value }))} placeholder="Ex: Módulo 2, Unit 3 (opcional)" />
              </Field>
              <Field label="Data de aplicação">
                <Input type="date" value={form.data_aplicacao ?? ""} onChange={(e) => setForm((p) => ({ ...p, data_aplicacao: e.target.value }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Início">
                  <Input type="time" value={form.hora_inicio ?? ""} onChange={(e) => setForm((p) => ({ ...p, hora_inicio: e.target.value }))} />
                </Field>
                <Field label="Término">
                  <Input type="time" value={form.hora_fim ?? ""} onChange={(e) => setForm((p) => ({ ...p, hora_fim: e.target.value }))} />
                </Field>
              </div>
              <Field label="Descrição">
                <textarea
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={2}
                  value={form.descricao ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Contexto pedagógico (opcional)"
                />
              </Field>
              <p className="text-xs text-muted">As questões são adicionadas na página de detalhe após criar.</p>
              <div className="flex gap-3 justify-end pt-1">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
                <Button type="submit" loading={saving}>Criar e adicionar questões</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
