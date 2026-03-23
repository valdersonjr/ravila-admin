"use client";
import { useEffect, useState } from "react";
import { livrosService, type Livro } from "@/services/admin/livros";
import { getErrorMessage } from "@/lib/utils";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";

export default function LivrosPage() {
  const { showToast } = useToast();
  const [livros, setLivros] = useState<Livro[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Create form
  const [newTitulo, setNewTitulo] = useState("");
  const [newSerie, setNewSerie] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editSerie, setEditSerie] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete/deactivate modal
  const [deleteTarget, setDeleteTarget] = useState<Livro | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try { setLivros(await livrosService.listar(includeInactive)); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [includeInactive]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitulo.trim()) return;
    setCreating(true);
    try {
      await livrosService.criar({ titulo: newTitulo.trim(), serie: newSerie.trim() || undefined });
      showToast("Livro criado!");
      setNewTitulo("");
      setNewSerie("");
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar livro."), "error");
    } finally { setCreating(false); }
  }

  function startEdit(livro: Livro) {
    setEditingId(livro.id);
    setEditTitulo(livro.titulo);
    setEditSerie(livro.serie ?? "");
  }

  async function handleSave(livro: Livro) {
    setSaving(true);
    try {
      await livrosService.atualizar(livro.id, {
        titulo: editTitulo.trim(),
        serie: editSerie.trim() || null,
      });
      showToast("Livro atualizado!");
      setEditingId(null);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar."), "error");
    } finally { setSaving(false); }
  }

  async function handleToggleAtivo() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await livrosService.atualizar(deleteTarget.id, { ativo: !deleteTarget.ativo });
      showToast(deleteTarget.ativo ? "Livro desativado!" : "Livro reativado!");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro."), "error");
    } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Livros</h1>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} className="accent-primary-600" />
          Incluir inativos
        </label>
      </div>

      <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end bg-surface border border-border rounded-xl p-4">
        <div className="flex-1 min-w-40">
          <label className="block text-sm font-medium text-foreground mb-1">Título *</label>
          <Input value={newTitulo} onChange={(e) => setNewTitulo(e.target.value)} placeholder="Ex: Interchange 1" required />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-foreground mb-1">Série</label>
          <Input value={newSerie} onChange={(e) => setNewSerie(e.target.value)} placeholder="Ex: Interchange" />
        </div>
        <Button type="submit" loading={creating}>+ Adicionar</Button>
      </form>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<Livro>
          keyExtractor={(l) => l.id}
          data={livros}
          emptyMessage="Nenhum livro cadastrado."
          columns={[
            {
              header: "Título",
              render: (l) => editingId === l.id
                ? <Input value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} />
                : <span className="font-medium text-foreground">{l.titulo}</span>,
            },
            {
              header: "Série",
              render: (l) => editingId === l.id
                ? <Input value={editSerie} onChange={(e) => setEditSerie(e.target.value)} placeholder="—" />
                : (l.serie ?? "—"),
            },
            {
              header: "Status",
              render: (l) => <Badge variant={l.ativo ? "success" : "neutral"}>{l.ativo ? "Ativo" : "Inativo"}</Badge>,
            },
            {
              header: "Ações",
              render: (l) => editingId === l.id ? (
                <div className="flex gap-2">
                  <Button size="sm" loading={saving} onClick={() => handleSave(l)}>Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(l)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(l)}>
                    {l.ativo ? "Desativar" : "Reativar"}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      {deleteTarget && (
        <Modal
          title={deleteTarget.ativo ? "Desativar livro" : "Reativar livro"}
          message={`Deseja ${deleteTarget.ativo ? "desativar" : "reativar"} o livro "${deleteTarget.titulo}"?`}
          confirmLabel={deleteTarget.ativo ? "Desativar" : "Reativar"}
          onConfirm={handleToggleAtivo}
          onClose={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
