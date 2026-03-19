"use client";
import { useEffect, useState } from "react";
import { professoresService, type Professor } from "@/services/admin/professores";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

export default function ProfessoresPage() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    professoresService.listar().then(setProfessores).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Professores</h1>
        <Link href="/admin/professores/novo"><Button>+ Novo Professor</Button></Link>
      </div>

      <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<Professor>
          keyExtractor={(p) => p.pessoa_id}
          data={search ? professores.filter((p) => p.pessoa.nome.toLowerCase().includes(search.toLowerCase())) : professores}
          columns={[
            { header: "Nome", render: (p) => <Link href={`/admin/professores/${p.pessoa_id}/dashboard`} className="text-primary-600 hover:underline">{p.pessoa.nome}</Link> },
            { header: "CPF", render: (p) => p.pessoa.cpf },
            {
              header: "Contrato",
              render: (p) => <Badge variant={p.tipo_contrato === "clt" ? "primary" : "warning"}>{p.tipo_contrato.toUpperCase()}</Badge>,
            },
            {
              header: "Remuneração",
              render: (p) => {
                if (p.tipo_contrato === "pj" && p.valor_por_aula != null)
                  return `R$ ${Number(p.valor_por_aula).toFixed(2)}/aula`;
                if (p.tipo_contrato === "clt" && p.salario != null)
                  return `R$ ${Number(p.salario).toFixed(2)}/mês`;
                return "-";
              },
            },
            {
              header: "Status",
              render: (p) => <Badge variant={p.ativo ? "success" : "neutral"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>,
            },
            {
              header: "Ações",
              render: (p) => (
                <Link href={`/admin/professores/${p.pessoa_id}/editar`} className="text-primary-600 hover:underline text-sm">Editar</Link>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
