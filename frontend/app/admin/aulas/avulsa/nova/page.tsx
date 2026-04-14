"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { aulasService } from "@/services/admin/aulas";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { formatCpf } from "@/lib/masks";
import { professoresService, type Professor } from "@/services/admin/professores";
import { getErrorMessage } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";

export default function NovaAulaAvulsaPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);

  const [alunoId, setAlunoId] = useState<number | string | null>(null);
  const [professorId, setProfessorId] = useState<number | string | null>(null);
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    Promise.all([pessoasService.listar({ page_size: 500 }), professoresService.listar()]).then(([ps, profs]) => {
      setPessoas(ps.items);
      setProfessores(profs.filter((p) => p.ativo));
    }).finally(() => setLoadingOptions(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!alunoId || !professorId || !horaInicio || !horaFim) {
      showToast("Preencha todos os campos obrigatórios.", "error");
      return;
    }
    setLoading(true);
    try {
      await aulasService.criarAvulsa({
        aluno_id: Number(alunoId),
        professor_id: Number(professorId),
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        descricao: descricao || undefined,
      });
      showToast("Aula experimental criada com sucesso!");
      router.push("/admin/aulas");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar aula experimental."), "error");
    } finally {
      setLoading(false);
    }
  }

  const pessoaOptions = pessoas.map((p) => ({ value: p.id, label: `${p.nome} — ${formatCpf(p.cpf)}` }));
  const professorOptions = professores.map((p) => ({ value: p.pessoa_id, label: p.pessoa.nome }));

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nova Aula Experimental</h1>
        <p className="text-sm text-muted mt-1">Aula sem vínculo com turma para pessoa ainda não matriculada.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Aluno *">
          <Combobox options={pessoaOptions} value={alunoId} onChange={setAlunoId} placeholder="Buscar aluno..." loading={loadingOptions} />
        </Field>
        <Field label="Professor *">
          <Combobox options={professorOptions} value={professorId} onChange={setProfessorId} placeholder="Selecionar professor..." loading={loadingOptions} />
        </Field>
        <Field label="Data *">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </Field>
        <div className="flex gap-3">
          <Field label="Início *">
            <Input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              required
            />
          </Field>
          <Field label="Fim *">
            <Input
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
              required
            />
          </Field>
        </div>
        <Field label="Observações">
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            placeholder="Conteúdo da aula, observações..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </Field>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>Criar aula experimental</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
