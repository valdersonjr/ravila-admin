"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { alunosService } from "@/services/admin/alunos";
import { getErrorMessage } from "@/lib/utils";
import { niveisService, type Nivel } from "@/services/admin/niveis";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { contratosService, type Contrato } from "@/services/admin/contratos";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";
import { Field } from "@/components/ui/Field";

const NIVEIS_CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
import Link from "next/link";

export default function EditarAlunoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [contratoAtivo, setContratoAtivo] = useState<Contrato | null | undefined>(undefined);
  const [nivelId, setNivelId] = useState<number | string | null>(null);
  const [responsavelId, setResponsavelId] = useState<number | string | null>(null);
  const [eMenor, setEMenor] = useState(false);
  const [aniversario, setAniversario] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [nivelQuestao, setNivelQuestao] = useState("");
  const [nomeAluno, setNomeAluno] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      alunosService.buscar(Number(id)),
      niveisService.listar(),
      pessoasService.listar({ page_size: 500 }),
      contratosService.listar({ aluno_id: Number(id), status: "ativo", page_size: 1 }),
    ]).then(([aluno, ns, ps, contratos]) => {
      setNivelId(aluno.nivel?.id ?? null);
      setResponsavelId(aluno.responsavel?.id ?? null);
      setEMenor(aluno.pessoa?.menor_de_idade ?? false);
      setAniversario(aluno.aniversario ?? "");
      setDataNascimento(aluno.data_nascimento ?? "");
      setNivelQuestao(aluno.nivel_questao ?? "");
      setNomeAluno(aluno.pessoa.nome);
      setNiveis(ns);
      setPessoas(ps.items);
      setContratoAtivo(contratos.items[0] ?? null);
    }).finally(() => setLoadingData(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await alunosService.atualizar(Number(id), {
        nivel_id: nivelId ? Number(nivelId) : undefined,
        responsavel_id: responsavelId ? Number(responsavelId) : undefined,
        aniversario: aniversario || undefined,
        data_nascimento: dataNascimento || undefined,
        nivel_questao: nivelQuestao || null,
      });
      showToast("Aluno atualizado!");
      router.push("/admin/alunos");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar."), "error");
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

      {/* Card de contrato */}
      {contratoAtivo !== undefined && (
        <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${contratoAtivo ? "border-success-300 bg-success-100" : "border-warning-300 bg-warning-100"}`}>
          {contratoAtivo ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="success">Contrato ativo</Badge>
                <span className="text-foreground font-medium">#{contratoAtivo.id} · {contratoAtivo.curso}</span>
                <span className="text-muted">até {new Date(contratoAtivo.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}</span>
              </div>
              <Link href={`/admin/contratos/${contratoAtivo.id}`} className="text-primary-600 hover:underline text-sm shrink-0">Ver</Link>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-warning-600 font-medium">Sem contrato ativo</span>
              <Link href={`/admin/contratos/novo`} className="text-primary-600 hover:underline text-sm">+ Novo contrato</Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nível">
          <Combobox options={nivelOptions} value={nivelId} onChange={setNivelId} placeholder="Selecionar nível..." />
        </Field>
        {eMenor && (
          <Field label="Responsável *">
            <Combobox options={pessoaOptions} value={responsavelId} onChange={setResponsavelId} placeholder="Buscar responsável por nome ou CPF..." />
          </Field>
        )}
        <Field label="Nível de Inglês">
          <Select
            value={nivelQuestao}
            onChange={(e) => setNivelQuestao(e.target.value)}
            options={[
              { value: "", label: "Sem nível" },
              ...NIVEIS_CEFR.map((n) => ({ value: n, label: n })),
            ]}
          />
        </Field>
        <Field label="Aniversário">
          <Input value={aniversario} onChange={(e) => setAniversario(e.target.value)} placeholder="DD/MM" maxLength={5} />
        </Field>
        <Field label="Data de nascimento">
          <Input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
        </Field>
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Salvar</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
