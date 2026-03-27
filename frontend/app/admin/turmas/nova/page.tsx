"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { turmasService } from "@/services/admin/turmas";
import { getErrorMessage } from "@/lib/utils";
import { professoresService, type Professor } from "@/services/admin/professores";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { Field } from "@/components/ui/Field";

export default function NovaTurmaPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [nome, setNome] = useState("");
  const [livro, setLivro] = useState("");
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [professorId, setProfessorId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    professoresService.listar().then((ps) => setProfessores(ps.filter((p) => p.ativo)));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!professorId) { showToast("Selecione um professor.", "error"); return; }
    setLoading(true);
    try {
      const turma = await turmasService.criar({
        nome: nome.trim(),
        livro: livro.trim() || undefined,
        professor_id: Number(professorId),
      });
      showToast("Turma criada! Adicione horários e gere aulas.");
      router.push(`/admin/turmas/${turma.id}`);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar turma."), "error");
    } finally { setLoading(false); }
  }

  const professorOptions = professores.map((p) => ({ value: p.pessoa_id, label: p.pessoa.nome }));

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Nova Turma</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome *">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Turma Manhã A1" required />
        </Field>
        <Field label="Livro">
          <Input value={livro} onChange={(e) => setLivro(e.target.value)} placeholder="Ex: Interchange 1" />
        </Field>
        <Field label="Professor *">
          <Combobox options={professorOptions} value={professorId} onChange={setProfessorId} placeholder="Selecionar professor..." />
        </Field>
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Criar e adicionar horários</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
