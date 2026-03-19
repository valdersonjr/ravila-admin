"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { alunosService } from "@/services/admin/alunos";
import { niveisService, type Nivel } from "@/services/admin/niveis";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-foreground mb-1">{label}</label>{children}</div>;
}

export default function EditarAlunoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [nivelId, setNivelId] = useState<number | string | null>(null);
  const [responsavelId, setResponsavelId] = useState<number | string | null>(null);
  const [eMenor, setEMenor] = useState(false);
  const [status, setStatus] = useState("ativo");
  const [nomeAluno, setNomeAluno] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      alunosService.buscar(Number(id)),
      niveisService.listar(),
      pessoasService.listar(),
    ]).then(([aluno, ns, ps]) => {
      setNivelId(aluno.nivel?.id ?? null);
      setResponsavelId(aluno.responsavel?.id ?? null);
      setEMenor(aluno.pessoa?.menor_de_idade ?? false);
      setStatus(aluno.status);
      setNomeAluno(aluno.pessoa.nome);
      setNiveis(ns);
      setPessoas(ps);
    }).finally(() => setLoadingData(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await alunosService.atualizar(Number(id), {
        nivel_id: nivelId ? Number(nivelId) : undefined,
        responsavel_id: responsavelId ? Number(responsavelId) : undefined,
        status,
      });
      showToast("Aluno atualizado!");
      router.push("/admin/alunos");
    } catch (err: any) {
      showToast(err.message ?? "Erro ao atualizar.", "error");
    } finally { setLoading(false); }
  }

  if (loadingData) {
    return <div className="flex justify-center h-40 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }

  const nivelOptions = niveis.map((n) => ({ value: n.id, label: n.nome }));
  const pessoaOptions = pessoas.map((p) => ({ value: p.id, label: p.nome }));

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Editar Aluno — {nomeAluno}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nível">
          <Combobox options={nivelOptions} value={nivelId} onChange={setNivelId} placeholder="Selecionar nível..." />
        </Field>
        {eMenor && (
          <Field label="Responsável *">
            <Combobox options={pessoaOptions} value={responsavelId} onChange={setResponsavelId} placeholder="Buscar responsável por nome ou CPF..." />
          </Field>
        )}
        <Field label="Status">
          <Select
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "inativo", label: "Inativo" },
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
