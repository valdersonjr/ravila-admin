"use client";
import { useEffect, useState } from "react";
import { usersService, type User } from "@/services/admin/users";
import { getErrorMessage } from "@/lib/utils";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { formatCpf } from "@/lib/masks";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { Field } from "@/components/ui/Field";

const FILTER_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "admin", label: "Admin" },
  { value: "secretario", label: "Secretário" },
  { value: "professor", label: "Professor" },
];

const ROLE_OPTIONS = [
  { value: "professor", label: "Professor" },
  { value: "secretario", label: "Secretário" },
  { value: "admin", label: "Admin" },
];

function userRole(u: User): string {
  if (u.is_admin) return "admin";
  if (u.is_secretario) return "secretario";
  return "professor";
}

const roleVariant: Record<string, "primary" | "warning" | "neutral"> = {
  admin: "primary",
  secretario: "warning",
  professor: "neutral",
};

const roleLabel: Record<string, string> = {
  admin: "Admin",
  secretario: "Secretário",
  professor: "Professor",
};

export default function UsersPage() {
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [search, setSearch] = useState("");

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createUsername, setCreateUsername] = useState("");
  const [createRole, setCreateRole] = useState("secretario");
  const [createSenha, setCreateSenha] = useState("");
  const [createPessoaId, setCreatePessoaId] = useState<number | string | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState("professor");
  const [editSenha, setEditSenha] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setUsers(await usersService.listar(filterRole || undefined));
    } finally { setLoading(false); }
  }

  useEffect(() => {
    pessoasService.listar({ page_size: 500 }).then((r) => setPessoas(r.items));
    load();
  }, [filterRole]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createUsername || !createSenha) { showToast("Preencha usuário e senha.", "error"); return; }
    setCreating(true);
    try {
      await usersService.criar({
        username: createUsername.trim(),
        senha: createSenha,
        is_admin: createRole === "admin",
        is_secretario: createRole === "secretario",
        pessoa_id: createPessoaId ? Number(createPessoaId) : undefined,
      });
      showToast("Usuário criado com sucesso!");
      setShowCreate(false);
      setCreateUsername("");
      setCreateSenha("");
      setCreateRole("secretario");
      setCreatePessoaId(null);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar usuário."), "error");
    } finally { setCreating(false); }
  }

  function openEdit(u: User) {
    setEditTarget(u);
    setEditUsername(u.username);
    setEditRole(userRole(u));
    setEditSenha("");
    setEditAtivo(u.ativo);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      const data: Parameters<typeof usersService.atualizar>[1] = {
        username: editUsername.trim(),
        is_admin: editRole === "admin",
        is_secretario: editRole === "secretario",
        ativo: editAtivo,
      };
      if (editSenha) data.senha = editSenha;
      await usersService.atualizar(editTarget.id, data);
      showToast("Usuário atualizado!");
      setEditTarget(null);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar usuário."), "error");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await usersService.deletar(deleteTarget.id);
      showToast("Usuário excluído.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao excluir usuário."), "error");
    } finally { setDeleting(false); }
  }

  const pessoaOptions = pessoas.map((p) => ({ value: p.id, label: p.nome }));
  const filteredUsers = search
    ? users.filter((u) =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.pessoa?.nome.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : users;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        <Button onClick={() => setShowCreate(true)}>+ Novo Usuário</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Buscar por usuário ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select options={FILTER_OPTIONS} value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-48" />
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<User>
          keyExtractor={(u) => u.id}
          data={filteredUsers}
          columns={[
            { header: "Usuário", render: (u) => <span className="font-mono text-sm">{u.username}</span> },
            { header: "Pessoa vinculada", render: (u) => u.pessoa ? `${u.pessoa.nome}${u.pessoa.cpf ? ` · ${formatCpf(u.pessoa.cpf)}` : ""}` : <span className="text-muted text-xs">Nenhuma</span> },
            { header: "Role", render: (u) => {
              const role = userRole(u);
              return <Badge variant={roleVariant[role]}>{roleLabel[role]}</Badge>;
            }},
            { header: "Status", render: (u) => <Badge variant={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge> },
            {
              header: "Ações",
              render: (u) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(u)}>Excluir</Button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Novo Usuário</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Usuário (login) *">
                <Input value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} placeholder="ex: joao.silva" required />
              </Field>
              <Field label="Senha *">
                <Input type="password" value={createSenha} onChange={(e) => setCreateSenha(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
              </Field>
              <Field label="Tipo *">
                <Select options={ROLE_OPTIONS} value={createRole} onChange={(e) => setCreateRole(e.target.value)} />
              </Field>
              <Field label="Pessoa vinculada (opcional)">
                <Combobox options={pessoaOptions} value={createPessoaId} onChange={setCreatePessoaId} placeholder="Buscar pessoa..." />
              </Field>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>Cancelar</Button>
                <Button type="submit" loading={creating}>Criar usuário</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setEditTarget(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Editar Usuário</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <Field label="Usuário (login)">
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} required />
              </Field>
              <Field label="Tipo">
                <Select options={ROLE_OPTIONS} value={editRole} onChange={(e) => setEditRole(e.target.value)} />
              </Field>
              <Field label="Status">
                <Select
                  options={[
                    { value: "true", label: "Ativo" },
                    { value: "false", label: "Inativo" },
                  ]}
                  value={String(editAtivo)}
                  onChange={(e) => setEditAtivo(e.target.value === "true")}
                />
              </Field>
              <Field label="Nova senha (deixe em branco para não alterar)">
                <Input type="password" value={editSenha} onChange={(e) => setEditSenha(e.target.value)} minLength={6} placeholder="Mínimo 6 caracteres" />
              </Field>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setEditTarget(null)} disabled={saving}>Cancelar</Button>
                <Button type="submit" loading={saving}>Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <Modal
          title="Excluir usuário"
          message={`Tem certeza que deseja excluir o usuário "${deleteTarget.username}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
