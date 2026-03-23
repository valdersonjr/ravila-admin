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

const ROLE_CREATE_OPTIONS = [
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

  const [showCreate, setShowCreate] = useState(false);
  const [createPessoaId, setCreatePessoaId] = useState<number | string | null>(null);
  const [createRole, setCreateRole] = useState("professor");
  const [createSenha, setCreateSenha] = useState("");
  const [creating, setCreating] = useState(false);

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

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
    if (!createPessoaId || !createSenha) { showToast("Preencha todos os campos.", "error"); return; }
    setCreating(true);
    try {
      await usersService.criar({
        pessoa_id: Number(createPessoaId),
        senha: createSenha,
        is_admin: createRole === "admin",
        is_secretario: createRole === "secretario",
      });
      showToast("Usuário criado com sucesso!");
      setShowCreate(false);
      setCreatePessoaId(null);
      setCreateSenha("");
      setCreateRole("professor");
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar usuário."), "error");
    } finally { setCreating(false); }
  }

  async function handleToggleAtivo() {
    if (!toggleTarget) return;
    setTogglingId(toggleTarget.pessoa_id);
    try {
      await usersService.atualizar(toggleTarget.pessoa_id, { ativo: !toggleTarget.ativo });
      showToast(`Usuário ${toggleTarget.ativo ? "desativado" : "ativado"}!`);
      setToggleTarget(null);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar."), "error");
    } finally { setTogglingId(null); }
  }

  const pessoaOptions = pessoas.map((p) => ({ value: p.id, label: p.nome }));
  const filteredUsers = search
    ? users.filter((u) => u.pessoa?.nome.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        <Button onClick={() => setShowCreate(true)}>+ Novo Usuário</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select options={FILTER_OPTIONS} value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-48" />
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<User>
          keyExtractor={(u) => u.pessoa_id}
          data={filteredUsers}
          columns={[
            { header: "Nome", render: (u) => u.pessoa?.nome ?? `Pessoa ${u.pessoa_id}` },
            { header: "CPF", render: (u) => formatCpf(u.pessoa?.cpf) },
            { header: "Role", render: (u) => {
              const role = userRole(u);
              return <Badge variant={roleVariant[role]}>{roleLabel[role]}</Badge>;
            }},
            { header: "Status", render: (u) => <Badge variant={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge> },
            {
              header: "Ações",
              render: (u) => (
                <Button size="sm" variant="outline" loading={togglingId === u.pessoa_id} onClick={() => setToggleTarget(u)}>
                  {u.ativo ? "Desativar" : "Ativar"}
                </Button>
              ),
            },
          ]}
        />
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Novo Usuário</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Pessoa *">
                <Combobox options={pessoaOptions} value={createPessoaId} onChange={setCreatePessoaId} placeholder="Buscar pessoa..." />
              </Field>
              <Field label="Tipo *">
                <Select options={ROLE_CREATE_OPTIONS} value={createRole} onChange={(e) => setCreateRole(e.target.value)} />
              </Field>
              <Field label="Senha *">
                <Input type="password" value={createSenha} onChange={(e) => setCreateSenha(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
              </Field>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>Cancelar</Button>
                <Button type="submit" loading={creating}>Criar usuário</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toggleTarget && (
        <Modal
          title={toggleTarget.ativo ? "Desativar usuário" : "Ativar usuário"}
          message={`Tem certeza que deseja ${toggleTarget.ativo ? "desativar" : "ativar"} o usuário ${toggleTarget.pessoa?.nome}?`}
          confirmLabel={toggleTarget.ativo ? "Desativar" : "Ativar"}
          onConfirm={handleToggleAtivo}
          onClose={() => setToggleTarget(null)}
          loading={togglingId === toggleTarget.pessoa_id}
        />
      )}
    </div>
  );
}
