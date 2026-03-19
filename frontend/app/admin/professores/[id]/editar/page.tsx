"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { professoresService } from "@/services/admin/professores";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-foreground mb-1">{label}</label>{children}</div>;
}

export default function EditarProfessorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [nomeProfessor, setNomeProfessor] = useState("");
  const [tipoContrato, setTipoContrato] = useState<"clt" | "pj">("clt");
  const [salario, setSalario] = useState("");
  const [valorPorAula, setValorPorAula] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    professoresService.buscar(Number(id)).then((p) => {
      setNomeProfessor(p.pessoa.nome);
      setTipoContrato(p.tipo_contrato);
      setSalario(p.salario != null ? String(p.salario) : "");
      setValorPorAula(p.valor_por_aula != null ? String(p.valor_por_aula) : "");
      setAtivo(p.ativo);
    }).finally(() => setLoadingData(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await professoresService.atualizar(Number(id), {
        tipo_contrato: tipoContrato,
        salario: tipoContrato === "clt" && salario ? Number(salario) : undefined,
        valor_por_aula: tipoContrato === "pj" && valorPorAula ? Number(valorPorAula) : undefined,
      });
      showToast("Professor atualizado!");
      router.push("/admin/professores");
    } catch (err: any) {
      showToast(err.message ?? "Erro ao atualizar.", "error");
    } finally { setLoading(false); }
  }

  if (loadingData) {
    return <div className="flex justify-center h-40 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Editar Professor — {nomeProfessor}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Tipo de contrato">
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
        <Field label="Status">
          <Select
            options={[
              { value: "true", label: "Ativo" },
              { value: "false", label: "Inativo" },
            ]}
            value={String(ativo)}
            onChange={(e) => setAtivo(e.target.value === "true")}
          />
        </Field>
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Salvar</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
