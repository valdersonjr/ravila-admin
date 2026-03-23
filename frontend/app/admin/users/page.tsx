"use client";
import { useEffect, useState } from "react";
import { usersService } from "@/services/admin/pagamentos";
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
  { value: "true", label: "Admin" },
  { value: "false", label: "Professor" },
];

const ROLE_CREATE_OPTIONS = [
  { value: "false", label: "Professor" },
  { value: "true", label: "Admin" },
];

interface User {
  pessoa_id: number;
  is_admin: boolean;
  ativo: boolean;
  pessoa: { id: number; nome: string; cpf: string } | null;
}

export default function UsersPage() {
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIsAdmin, setFilterIsAdmin] = useState("");
  const [search, setSearch] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createPessoaId, setCreatePessoaId] = useState<number | string | null>(null);
  const [createIsAdmin, setCreateIsAdmin] = useState("false");
  const [createSenha, setCreateSenha] = useState("");
  const [creating, setCreating] = useState(false);

  // Toggle ativo
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    try {
      const isAdmin = filterIsAdmin === "" ? undefined : filterIsAdmin === "true";
      setUsers((await usersService.listar(isAdmin)) as User[]);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    pessoasService.listar({ page_size: 500 }).then((r) => setPessoas(r.items));
    load();
  }, [filterIsAdmin]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createPessoaId || !createSenha) { showToast("Preencha todos os campos.", "error"); return; }
    setCreating(true);
    try {
      await usersService.criar({ pessoa_id: Number(createPessoaId), senha: createSenha, is_admin: createIsAdmin === "true" });
      showToast("Usuário criado com sucesso!");
      setShowCreate(false);
      setCreatePessoaId(null);
      setCreateSenha("");
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

  const roleVariant = (is_admin: boolean): "primary" | "warning" => is_admin ? "primary" : "warning";

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
        <Select options={FILTER_OPTIONS} value={filterIsAdmin} onChange={(e) => setFilterIsAdmin(e.target.value)} className="w-48" />
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
            { header: "Role", render: (u) => <Badge variant={roleVariant(u.is_admin)}>{u.is_admin ? "Admin" : "Professor"}</Badge> },
            { header: "Status", render: (u) => <Badge variant={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge> },
            {
              header: "Ações",
              render: (u) => (
                <Button
                  size="sm"
                  variant="outline"
                  loading={togglingId === u.pessoa_id}
                  onClick={() => setToggleTarget(u)}
                >
                  {u.ativo ? "Desativar" : "Ativar"}
                </Button>
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
              <Field label="Pessoa *">
                <Combobox options={pessoaOptions} value={createPessoaId} onChange={setCreatePessoaId} placeholder="Buscar pessoa..." />
              </Field>
              <Field label="Tipo *">
                <Select options={ROLE_CREATE_OPTIONS} value={createIsAdmin} onChange={(e) => setCreateIsAdmin(e.target.value)} />
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
