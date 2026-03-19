"use client";
import { useEffect, useState } from "react";
import { usersService } from "@/services/admin/pagamentos";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { useToast } from "@/context/ToastContext";

const ROLE_OPTIONS = [
  { value: "", label: "Todos os roles" },
  { value: "admin", label: "Admin" },
  { value: "professor", label: "Professor" },
  { value: "secretaria", label: "Secretaria" },
];

const ROLE_CREATE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "professor", label: "Professor" },
  { value: "secretaria", label: "Secretaria" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-foreground mb-1">{label}</label>{children}</div>;
}

interface User {
  pessoa_id: number;
  role: string;
  ativo: boolean;
  pessoa: { id: number; nome: string; cpf: string } | null;
}

export default function UsersPage() {
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createPessoaId, setCreatePessoaId] = useState<number | string | null>(null);
  const [createRole, setCreateRole] = useState("professor");
  const [createSenha, setCreateSenha] = useState("");
  const [creating, setCreating] = useState(false);

  // Toggle ativo
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      setUsers((await usersService.listar(filterRole || undefined)) as User[]);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    pessoasService.listar().then(setPessoas);
    load();
  }, [filterRole]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createPessoaId || !createSenha) { showToast("Preencha todos os campos.", "error"); return; }
    setCreating(true);
    try {
      await usersService.criar({ pessoa_id: Number(createPessoaId), senha: createSenha, role: createRole });
      showToast("Usuário criado com sucesso!");
      setShowCreate(false);
      setCreatePessoaId(null);
      setCreateSenha("");
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao criar usuário.", "error");
    } finally { setCreating(false); }
  }

  async function handleToggleAtivo(user: User) {
    setTogglingId(user.pessoa_id);
    try {
      await usersService.atualizar(user.pessoa_id, { ativo: !user.ativo });
      showToast(`Usuário ${user.ativo ? "desativado" : "ativado"}!`);
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao atualizar.", "error");
    } finally { setTogglingId(null); }
  }

  const roleVariant: Record<string, "primary" | "warning" | "neutral"> = {
    admin: "primary",
    professor: "warning",
    secretaria: "neutral",
  };

  const pessoaOptions = pessoas.map((p) => ({ value: p.id, label: `${p.nome} — ${p.cpf}` }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        <Button onClick={() => setShowCreate(true)}>+ Novo Usuário</Button>
      </div>

      <Select
        options={ROLE_OPTIONS}
        value={filterRole}
        onChange={(e) => setFilterRole(e.target.value)}
        className="w-48"
      />

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<User>
          keyExtractor={(u) => u.pessoa_id}
          data={users}
          columns={[
            { header: "Nome", render: (u) => u.pessoa?.nome ?? `Pessoa ${u.pessoa_id}` },
            { header: "CPF", render: (u) => u.pessoa?.cpf ?? "-" },
            { header: "Role", render: (u) => <Badge variant={roleVariant[u.role] ?? "neutral"}>{u.role}</Badge> },
            { header: "Status", render: (u) => <Badge variant={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge> },
            {
              header: "Ações",
              render: (u) => (
                <Button
                  size="sm"
                  variant="outline"
                  loading={togglingId === u.pessoa_id}
                  onClick={() => handleToggleAtivo(u)}
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
              <Field label="Role *">
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
    </div>
  );
}
