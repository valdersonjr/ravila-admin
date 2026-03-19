"use client";
import { useEffect, useState } from "react";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

export default function PessoasPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setPessoas(await pessoasService.listar(search || undefined)); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Pessoas</h1>
        <Link href="/admin/pessoas/nova"><Button>+ Nova Pessoa</Button></Link>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Buscar por nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Button variant="outline" onClick={load}>Buscar</Button>
      </div>
      {loading ? <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div> : (
        <Table<Pessoa>
          keyExtractor={(p) => p.id}
          data={pessoas}
          columns={[
            { header: "Nome", render: (p) => p.nome },
            { header: "CPF", render: (p) => p.cpf ?? "-" },
            { header: "Email", render: (p) => p.email ?? "-" },
            { header: "Telefone", render: (p) => p.telefone ?? "-" },
            { header: "Ações", render: (p) => <Link href={`/admin/pessoas/${p.id}/editar`} className="text-primary-600 hover:underline text-sm">Editar</Link> },
          ]}
        />
      )}
    </div>
  );
}
