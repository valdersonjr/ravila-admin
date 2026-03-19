"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { professoresService } from "@/services/admin/professores";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-foreground mb-1">{label}</label>{children}</div>;
}

export default function NovoProfessorPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [pessoaId, setPessoaId] = useState<number | string | null>(null);
  const [tipoContrato, setTipoContrato] = useState<"clt" | "pj">("clt");
  const [salario, setSalario] = useState("");
  const [valorPorAula, setValorPorAula] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { pessoasService.listar().then(setPessoas); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pessoaId) { showToast("Selecione uma pessoa.", "error"); return; }
    setLoading(true);
    try {
      await professoresService.criar({
        pessoa_id: Number(pessoaId),
        tipo_contrato: tipoContrato,
        salario: tipoContrato === "clt" && salario ? Number(salario) : undefined,
        valor_por_aula: tipoContrato === "pj" && valorPorAula ? Number(valorPorAula) : undefined,
      });
      showToast("Professor criado com sucesso!");
      router.push("/admin/professores");
    } catch (err: any) {
      showToast(err.message ?? "Erro ao criar professor.", "error");
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
        <Field label="Tipo de contrato *">
          <Select
            options={[
              { value: "clt", label: "CLT" },
              { value: "pj", label: "PJ" },
            ]}
            value={tipoContrato}
            onChange={(e) => setTipoContrato(e.target.value as "clt" | "pj")}
          />
        </Field>
        {tipoContrato === "clt" && (
          <Field label="Salário (R$)">
            <Input type="number" step="0.01" min="0" value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="0.00" />
          </Field>
        )}
        {tipoContrato === "pj" && (
          <Field label="Valor por aula (R$)">
            <Input type="number" step="0.01" min="0" value={valorPorAula} onChange={(e) => setValorPorAula(e.target.value)} placeholder="0.00" />
          </Field>
        )}
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Salvar</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
