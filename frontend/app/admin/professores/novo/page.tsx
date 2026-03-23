"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { professoresService } from "@/services/admin/professores";
import { getErrorMessage } from "@/lib/utils";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { Combobox } from "@/components/ui/Combobox";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { Field } from "@/components/ui/Field";

export default function NovoProfessorPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [pessoaId, setPessoaId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { pessoasService.listar({ page_size: 500 }).then((r) => setPessoas(r.items)); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pessoaId) { showToast("Selecione uma pessoa.", "error"); return; }
    setLoading(true);
    try {
      await professoresService.criar({ pessoa_id: Number(pessoaId) });
      showToast("Professor criado com sucesso!");
      router.push("/admin/professores");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar professor."), "error");
    } finally { setLoading(false); }
  }

  const pessoaOptions = pessoas.map((p) => ({ value: p.id, label: p.nome }));

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Novo Professor</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Pessoa *">
          <Combobox options={pessoaOptions} value={pessoaId} onChange={setPessoaId} placeholder="Buscar pessoa..." />
        </Field>
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Salvar</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
