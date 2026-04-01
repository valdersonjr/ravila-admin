"use client";
import { useEffect, useState } from "react";
import { materiaisService, type Material, CATEGORIAS, TIPOS } from "@/services/admin/materiais";
import { turmasService, type Turma } from "@/services/admin/turmas";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/lib/utils";

type Destinatario = "escola" | "turma" | "rascunho";

interface Props {
  aulaId?: number;
  turmaId?: number;
  canEdit?: boolean;
}

export function MateriaisSection({ aulaId, turmaId, canEdit = true }: Props) {
  const { showToast } = useToast();

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  // Formulário
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<Material["tipo"]>("pdf");
  const [categoria, setCategoria] = useState("outro");
  const [urlExterna, setUrlExterna] = useState("");
  const [destinatario, setDestinatario] = useState<Destinatario>("turma");
  const [formTurmaId, setFormTurmaId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  // Upload / ações por item
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    const promises: Promise<unknown>[] = [
      materiaisService.listar({ aula_id: aulaId, turma_id: turmaId }),
    ];
    if (!aulaId) {
      promises.push(turmasService.listar({ status: "ativa", page_size: 500 }));
    }
    Promise.all(promises)
      .then(([mats, turs]) => {
        setMateriais(mats as Material[]);
        if (turs) setTurmas((turs as { items: Turma[] }).items);
      })
      .catch(() => showToast("Erro ao carregar materiais.", "error"))
      .finally(() => setLoading(false));
  }, [aulaId, turmaId]);

  function resetForm() {
    setTitulo("");
    setDescricao("");
    setTipo("pdf");
    setCategoria("outro");
    setUrlExterna("");
    setDestinatario("turma");
    setFormTurmaId("");
    setOpen(false);
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) { showToast("Título obrigatório.", "error"); return; }
    if (tipo === "link" && !urlExterna.trim()) { showToast("URL obrigatória para tipo link.", "error"); return; }
    if (!aulaId && destinatario === "turma" && !formTurmaId) { showToast("Selecione uma turma.", "error"); return; }

    setSaving(true);
    try {
      const m = await materiaisService.criar({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        tipo,
        categoria,
        url_externa: tipo === "link" ? urlExterna.trim() : undefined,
        aula_id: aulaId,
        turma_id: aulaId ? undefined : (destinatario === "turma" ? (formTurmaId || undefined) : undefined),
        publico: destinatario === "escola",
      });
      setMateriais((prev) => [m, ...prev]);
      resetForm();
      showToast("Material criado.");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar material."), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(materialId: number, file: File) {
    setUploadingId(materialId);
    try {
      const updated = await materiaisService.upload(materialId, file);
      setMateriais((prev) => prev.map((m) => (m.id === materialId ? updated : m)));
      showToast("Arquivo enviado.");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao enviar arquivo."), "error");
    } finally {
      setUploadingId(null);
    }
  }

  async function handleDownload(materialId: number) {
    setDownloadingId(materialId);
    try {
      const { url } = await materiaisService.download(materialId);
      window.open(url, "_blank");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao gerar link."), "error");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDeletar(materialId: number) {
    if (!confirm("Remover este material?")) return;
    setDeletingId(materialId);
    try {
      await materiaisService.deletar(materialId);
      setMateriais((prev) => prev.filter((m) => m.id !== materialId));
      showToast("Material removido.");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao remover material."), "error");
    } finally {
      setDeletingId(null);
    }
  }

  const categoriaLabel = (v: string) => CATEGORIAS.find((c) => c.value === v)?.label ?? v;

  const DESTINATARIOS: { value: Destinatario; label: string; desc: string }[] = [
    { value: "escola",   label: "Toda a escola",        desc: "Visível para todos os alunos" },
    { value: "turma",    label: "Uma turma específica",  desc: "Visível só para alunos dessa turma" },
    { value: "rascunho", label: "Somente eu",            desc: "Alunos não verão este material" },
  ];

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Materiais</h2>
        {canEdit && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-primary-600 hover:underline"
          >
            + Adicionar
          </button>
        )}
      </div>

      {/* Formulário de criação */}
      {open && (
        <form onSubmit={handleCriar} className="border border-border rounded-lg p-3 space-y-3 bg-background">
          <div className="grid grid-cols-2 gap-3">

            {/* Título */}
            <div className="col-span-2">
              <label className="text-xs text-muted block mb-1">Título *</label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Exercícios Unit 5"
                className="w-full rounded-md border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Tipo e Categoria */}
            <div>
              <label className="text-xs text-muted block mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as Material["tipo"])}
                className="w-full rounded-md border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none"
              >
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-md border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none"
              >
                {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* URL (só para tipo link) */}
            {tipo === "link" && (
              <div className="col-span-2">
                <label className="text-xs text-muted block mb-1">URL *</label>
                <input
                  type="url"
                  value={urlExterna}
                  onChange={(e) => setUrlExterna(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-md border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            {/* Descrição */}
            <div className="col-span-2">
              <label className="text-xs text-muted block mb-1">Descrição (opcional)</label>
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Breve descrição do material..."
                className="w-full rounded-md border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            {/* Destinatário — só exibido fora do contexto de aula */}
            {!aulaId && (
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs text-muted block">Quem vai ver este material?</label>
                {DESTINATARIOS.map(({ value, label, desc }) => (
                  <label
                    key={value}
                    className={[
                      "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                      destinatario === value
                        ? "border-primary-500 bg-primary-50"
                        : "border-border bg-surface hover:bg-border/40",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="destinatario"
                      value={value}
                      checked={destinatario === value}
                      onChange={() => { setDestinatario(value); setFormTurmaId(""); }}
                      className="mt-0.5 accent-primary-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground leading-none mb-0.5">{label}</p>
                      <p className="text-xs text-muted">{desc}</p>
                    </div>
                  </label>
                ))}

                {/* Dropdown de turma aparece só quando "turma" está selecionado */}
                {destinatario === "turma" && (
                  <select
                    value={formTurmaId}
                    onChange={(e) => setFormTurmaId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-md border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mt-1"
                  >
                    <option value="">Selecione a turma...</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              Criar
            </Button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-10 rounded-md bg-border animate-pulse" />)}
        </div>
      )}

      {!loading && materiais.length === 0 && (
        <p className="text-sm text-muted">Nenhum material adicionado.</p>
      )}

      {!loading && materiais.map((m) => (
        <div key={m.id} className="flex items-start justify-between gap-3 py-2 border-t border-border first:border-t-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{m.titulo}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted">{categoriaLabel(m.categoria)}</span>
              <span className="text-xs bg-border text-muted rounded px-1.5 py-0.5">{m.tipo.toUpperCase()}</span>
              {m.publico
                ? <span className="text-xs bg-primary-50 text-primary-600 rounded px-1.5 py-0.5">Toda a escola</span>
                : m.turma_nome
                  ? <span className="text-xs bg-border text-muted rounded px-1.5 py-0.5">{m.turma_nome}</span>
                  : null
              }
            </div>
            {m.descricao && <p className="text-xs text-muted mt-0.5 line-clamp-1">{m.descricao}</p>}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {m.tipo === "link" && m.url_externa && (
              <a
                href={m.url_externa}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:underline px-2 py-1"
              >
                Abrir
              </a>
            )}

            {m.tem_arquivo && (
              <button
                type="button"
                onClick={() => handleDownload(m.id)}
                disabled={downloadingId === m.id}
                className="text-xs text-primary-600 hover:underline px-2 py-1 disabled:opacity-50"
              >
                {downloadingId === m.id ? "..." : "Baixar"}
              </button>
            )}

            {canEdit && m.tipo !== "link" && (
              <>
                <input
                  type="file"
                  className="hidden"
                  id={`upload-${m.id}`}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(m.id, file);
                    e.target.value = "";
                  }}
                />
                <label
                  htmlFor={`upload-${m.id}`}
                  className={[
                    "text-xs px-2 py-1 cursor-pointer",
                    uploadingId === m.id ? "text-muted" : "text-primary-600 hover:underline",
                  ].join(" ")}
                >
                  {uploadingId === m.id ? "Enviando..." : m.tem_arquivo ? "Substituir" : "Upload"}
                </label>
              </>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => handleDeletar(m.id)}
                disabled={deletingId === m.id}
                className="text-xs text-rose-500 hover:underline px-2 py-1 disabled:opacity-50"
              >
                {deletingId === m.id ? "..." : "Remover"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
