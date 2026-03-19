"use client";
import { useEffect, useState } from "react";
import { niveisService, type Nivel } from "@/services/admin/niveis";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { Tooltip } from "@/components/ui/Tooltip";

export default function NiveisPage() {
  const { showToast } = useToast();
  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Create form
  const [newNome, setNewNome] = useState("");
  const [newOrdem, setNewOrdem] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editOrdem, setEditOrdem] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Nivel | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try { setNiveis(await niveisService.listar(includeInactive)); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [includeInactive]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newNome.trim() || !newOrdem) return;
    setCreating(true);
    try {
      await niveisService.criar({ nome: newNome.trim(), ordem: Number(newOrdem) });
      showToast("Nível criado!");
      setNewNome("");
      setNewOrdem("");
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao criar nível.", "error");
    } finally { setCreating(false); }
  }

  function startEdit(nivel: Nivel) {
    setEditingId(nivel.id);
    setEditNome(nivel.nome);
    setEditOrdem(String(nivel.ordem));
  }

  function cancelEdit() { setEditingId(null); }

  async function handleSave(nivel: Nivel) {
    setSaving(true);
    try {
      await niveisService.atualizar(nivel.id, { nome: editNome.trim(), ordem: Number(editOrdem) });
      showToast("Nível atualizado!");
      setEditingId(null);
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao atualizar.", "error");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await niveisService.deletar(deleteTarget.id);
      showToast("Nível removido!");
      setDeleteTarget(null);
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao remover.", "error");
    } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Níveis</h1>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} className="accent-primary-600" />
          Incluir inativos
        </label>
      </div>

      <form onSubmit={handleCreate} className="flex gap-3 items-end bg-surface border border-border rounded-xl p-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-1">Nome *</label>
          <Input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Ex: Beginner" required />
        </div>
        <div className="w-28">
          <label className="block text-sm font-medium text-foreground mb-1">
            Ordem *{" "}
            <Tooltip content={
              <span>
                Posição do nível na hierarquia de dificuldade. Exemplo:<br /><br />
                1 → Beginner<br />
                2 → Elementary<br />
                3 → Pre-Intermediate<br />
                4 → Intermediate<br />
                5 → Advanced
              </span>
            }>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-foreground text-xs font-bold">?</span>
            </Tooltip>
          </label>
          <Input type="number" value={newOrdem} onChange={(e) => setNewOrdem(e.target.value)} placeholder="1" required min="1" />
        </div>
        <Button type="submit" loading={creating}>+ Adicionar</Button>
      </form>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<Nivel>
          keyExtractor={(n) => n.id}
          data={niveis}
          columns={[
            {
              header: "Nome",
              render: (n) => editingId === n.id
                ? <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="max-w-xs" />
                : n.nome,
            },
            {
              header: "Ordem",
              render: (n) => editingId === n.id
                ? <Input type="number" value={editOrdem} onChange={(e) => setEditOrdem(e.target.value)} className="w-20" min="1" />
                : n.ordem,
              className: "w-20",
            },
            {
              header: "Status",
              render: (n) => <Badge variant={n.ativo ? "success" : "neutral"}>{n.ativo ? "Ativo" : "Inativo"}</Badge>,
            },
            {
              header: "Ações",
              render: (n) => editingId === n.id ? (
                <div className="flex gap-2">
                  <Button size="sm" loading={saving} onClick={() => handleSave(n)}>Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>Cancelar</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(n)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(n)} className="text-rose-600 hover:text-rose-700">Remover</Button>
                </div>
              ),
            },
          ]}
        />
      )}

      {deleteTarget && (
        <Modal
          title="Remover nível"
          message={`Tem certeza que deseja remover o nível "${deleteTarget.nome}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Remover"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
