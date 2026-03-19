"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { alunosService } from "@/services/admin/alunos";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { niveisService, type Nivel } from "@/services/admin/niveis";
import { Combobox } from "@/components/ui/Combobox";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-foreground mb-1">{label}</label>{children}</div>;
}

export default function NovoAlunoPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [loading, setLoading] = useState(false);

  const [pessoaId, setPessoaId] = useState<number | string | null>(null);
  const [nivelId, setNivelId] = useState<number | string | null>(null);
  const [responsavelId, setResponsavelId] = useState<number | string | null>(null);

  useEffect(() => {
    Promise.all([pessoasService.listar(), niveisService.listar()]).then(([p, n]) => {
      setPessoas(p);
      setNiveis(n);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pessoaId) { showToast("Selecione uma pessoa.", "error"); return; }
    setLoading(true);
    try {
      await alunosService.criar({
        pessoa_id: Number(pessoaId),
        nivel_id: nivelId ? Number(nivelId) : undefined,
        responsavel_id: responsavelId ? Number(responsavelId) : undefined,
      });
      showToast("Aluno criado com sucesso!");
      router.push("/admin/alunos");
    } catch (err: any) {
      showToast(err.message ?? "Erro ao criar aluno.", "error");
    } finally { setLoading(false); }
  }

  const pessoaOptions = pessoas.map((p) => ({ value: p.id, label: `${p.nome} — ${p.cpf}` }));
  const nivelOptions = niveis.map((n) => ({ value: n.id, label: n.nome }));

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Novo Aluno</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Pessoa *">
          <Combobox options={pessoaOptions} value={pessoaId} onChange={setPessoaId} placeholder="Buscar pessoa por nome ou CPF..." />
        </Field>
        <Field label="Nível">
          <Combobox options={nivelOptions} value={nivelId} onChange={setNivelId} placeholder="Selecionar nível..." />
        </Field>
        <Field label="Responsável (opcional)">
          <Combobox options={pessoaOptions} value={responsavelId} onChange={setResponsavelId} placeholder="Buscar responsável..." />
        </Field>
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Salvar</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
