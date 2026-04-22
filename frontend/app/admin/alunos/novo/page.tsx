"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { alunosService } from "@/services/admin/alunos";
import { getErrorMessage } from "@/lib/utils";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { niveisService, type Nivel } from "@/services/admin/niveis";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { Field } from "@/components/ui/Field";
import Link from "next/link";

export default function NovoAlunoPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [loading, setLoading] = useState(false);

  const [pessoaId, setPessoaId] = useState<number | string | null>(null);
  const [nivelId, setNivelId] = useState<number | string | null>(null);
  const [responsavelId, setResponsavelId] = useState<number | string | null>(null);
  const [aniversario, setAniversario] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");

  useEffect(() => {
    Promise.all([pessoasService.listar({ page_size: 500 }), niveisService.listar()]).then(([p, n]) => {
      setPessoas(p.items);
      setNiveis(n);
    });
  }, []);

  const pessoaSelecionada = pessoas.find((p) => p.id === Number(pessoaId)) ?? null;
  const eMenor = pessoaSelecionada?.menor_de_idade ?? false;

  function handlePessoaChange(val: number | string | null) {
    setPessoaId(val);
    setResponsavelId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pessoaId) { showToast("Selecione uma pessoa.", "error"); return; }
if (eMenor && !responsavelId) { showToast("Responsável obrigatório para menor de idade.", "error"); return; }
    setLoading(true);
    try {
      await alunosService.criar({
        pessoa_id: Number(pessoaId),
        nivel_id: nivelId ? Number(nivelId) : undefined,
        responsavel_id: responsavelId ? Number(responsavelId) : undefined,
        aniversario: aniversario || undefined,
        data_nascimento: dataNascimento || undefined,
      });
      showToast("Aluno criado com sucesso!");
      router.push("/admin/alunos");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar aluno."), "error");
    } finally { setLoading(false); }
  }

  const pessoaOptions = pessoas.map((p) => ({ value: p.id, label: p.nome }));
  const nivelOptions = niveis.map((n) => ({ value: n.id, label: n.nome }));

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Novo Aluno</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        A pessoa já precisa estar cadastrada no sistema.{" "}
        <Link href="/admin/pessoas/nova" className="font-semibold underline hover:text-amber-900">
          Cadastrar nova pessoa
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Pessoa *">
          <Combobox options={pessoaOptions} value={pessoaId} onChange={handlePessoaChange} placeholder="Buscar pessoa por nome ou CPF..." />
        </Field>
        <Field label="Nível">
          <Combobox options={nivelOptions} value={nivelId} onChange={setNivelId} placeholder="Selecionar nível..." />
        </Field>
        {eMenor && (
          <Field label="Responsável *">
            <Combobox
              options={pessoaOptions}
              value={responsavelId}
              onChange={setResponsavelId}
              placeholder="Buscar responsável por nome ou CPF..."
            />
          </Field>
        )}
        <Field label="Data de nascimento">
          <Input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
        </Field>
        <Field label="Aniversário (DD/MM)">
          <Input value={aniversario} onChange={(e) => setAniversario(e.target.value)} placeholder="DD/MM" maxLength={5} />
        </Field>
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Salvar</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
