"use client";
import { useEffect, useState } from "react";
import { alunosService, type Aluno } from "@/services/admin/alunos";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import Link from "next/link";

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [inadimplente, setInadimplente] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: { status?: string; inadimplente?: boolean } = {};
      if (status) params.status = status;
      if (inadimplente) params.inadimplente = true;
      setAlunos(await alunosService.listar(params));
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [status, inadimplente]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
        <Link href="/admin/alunos/novo"><Button>+ Novo Aluno</Button></Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Select
          options={[
            { value: "", label: "Todos os status" },
            { value: "ativo", label: "Ativo" },
            { value: "inativo", label: "Inativo" },
          ]}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-48"
        />
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={inadimplente} onChange={(e) => setInadimplente(e.target.checked)} className="accent-primary-600" />
          Apenas inadimplentes
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<Aluno>
          keyExtractor={(a) => a.pessoa_id}
          data={alunos}
          columns={[
            { header: "Nome", render: (a) => a.pessoa.nome },
            { header: "CPF", render: (a) => a.pessoa.cpf },
            { header: "Nível", render: (a) => a.nivel?.nome ?? "-" },
            { header: "Status", render: (a) => <Badge variant={a.status === "ativo" ? "success" : "neutral"}>{a.status}</Badge> },
            {
              header: "Ações",
              render: (a) => (
                <Link href={`/admin/alunos/${a.pessoa_id}/editar`} className="text-primary-600 hover:underline text-sm">Editar</Link>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
