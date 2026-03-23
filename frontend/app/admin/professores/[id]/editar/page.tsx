"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { professoresService } from "@/services/admin/professores";
import { getErrorMessage } from "@/lib/utils";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { Field } from "@/components/ui/Field";

export default function EditarProfessorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [nomeProfessor, setNomeProfessor] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    professoresService.buscar(Number(id)).then((p) => {
      setNomeProfessor(p.pessoa.nome);
      setAtivo(p.ativo);
    }).finally(() => setLoadingData(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await professoresService.atualizar(Number(id), { ativo });
      showToast("Professor atualizado!");
      router.push("/admin/professores");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar."), "error");
    } finally { setLoading(false); }
  }

  if (loadingData) {
    return <div className="flex justify-center h-40 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Editar Professor — {nomeProfessor}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
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
