"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { turmasService } from "@/services/admin/turmas";
import { niveisService, type Nivel } from "@/services/admin/niveis";
import { professoresService, type Professor } from "@/services/admin/professores";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-foreground mb-1">{label}</label>{children}</div>;
}

export default function NovaTurmaPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [nome, setNome] = useState("");
  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [nivelId, setNivelId] = useState<number | string | null>(null);
  const [professorId, setProfessorId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([niveisService.listar(), professoresService.listar()]).then(([ns, ps]) => {
      setNiveis(ns);
      setProfessores(ps.filter((p) => p.ativo));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!professorId) { showToast("Selecione um professor.", "error"); return; }
    setLoading(true);
    try {
      const turma = await turmasService.criar({
        nome: nome.trim(),
        nivel_id: nivelId ? Number(nivelId) : undefined,
        professor_id: Number(professorId),
      });
      showToast("Turma criada! Adicione horários e gere aulas.");
      router.push(`/admin/turmas/${turma.id}`);
    } catch (err: any) {
      showToast(err.message ?? "Erro ao criar turma.", "error");
    } finally { setLoading(false); }
  }

  const nivelOptions = niveis.map((n) => ({ value: n.id, label: n.nome }));
  const professorOptions = professores.map((p) => ({ value: p.pessoa_id, label: p.pessoa.nome }));

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Nova Turma</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome *">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Turma Manhã A1" required />
        </Field>
        <Field label="Nível">
          <Combobox options={nivelOptions} value={nivelId} onChange={setNivelId} placeholder="Selecionar nível..." />
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
