"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { contratosService } from "@/services/admin/contratos";
import { alunosService, type Aluno } from "@/services/admin/alunos";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { getErrorMessage } from "@/lib/utils";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";

export default function NovoContratoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipo = (searchParams.get("tipo") ?? "formal") as "formal" | "informal";
  const { showToast } = useToast();

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(false);

  // Multi-aluno: lista de IDs selecionados
  const [alunosSelecionados, setAlunosSelecionados] = useState<number[]>([]);
  const [alunoInput, setAlunoInput] = useState<number | string | null>(null);

  const [contratanteId, setContratanteId] = useState<number | string | null>(null);
  const [curso, setCurso] = useState("");
  const [valorMensalidade, setValorMensalidade] = useState("");
  const [tipoDesconto, setTipoDesconto] = useState<"percentual" | "valor">("percentual");
  const [descontoPercentual, setDescontoPercentual] = useState("");
  const [descontoValor, setDescontoValor] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("10");
  const [valorReposicao, setValorReposicao] = useState("35.00");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [localAssinatura, setLocalAssinatura] = useState("Goianésia GO");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    Promise.all([
      alunosService.listar({ page_size: 500 }),
      pessoasService.listar({ page_size: 500 }),
    ]).then(([a, p]) => {
      setAlunos(a.items);
      setPessoas(p.items);
    });
  }, []);

  function handleAddAluno(val: number | string | null) {
    if (!val) return;
    const id = Number(val);
    if (alunosSelecionados.includes(id)) return;

    setAlunosSelecionados((prev) => {
      const updated = [...prev, id];
      // Pré-preenche contratante com base no primeiro aluno adicionado
      if (prev.length === 0) {
        const aluno = alunos.find((a) => a.pessoa_id === id);
        if (aluno) {
          setContratanteId(aluno.responsavel ? aluno.responsavel.id : aluno.pessoa.id);
        }
      }
      return updated;
    });
    setAlunoInput(null);
  }

  function handleRemoveAluno(id: number) {
    setAlunosSelecionados((prev) => prev.filter((a) => a !== id));
  }

  const alunosSelecionadosObj = alunosSelecionados
    .map((id) => alunos.find((a) => a.pessoa_id === id))
    .filter(Boolean) as Aluno[];

  const valorComDesconto = (() => {
    const v = parseFloat(valorMensalidade);
    if (isNaN(v)) return null;
    if (tipoDesconto === "percentual") {
      const d = parseFloat(descontoPercentual);
      if (!isNaN(d) && d > 0) return v * (1 - d / 100);
    } else {
      const d = parseFloat(descontoValor);
      if (!isNaN(d) && d > 0) return Math.max(v - d, 0);
    }
    return null;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (alunosSelecionados.length === 0) { showToast("Adicione ao menos um aluno.", "error"); return; }
    if (!contratanteId) { showToast("Selecione o contratante.", "error"); return; }
    if (!curso.trim()) { showToast("Informe o curso.", "error"); return; }
    if (!valorMensalidade) { showToast("Informe o valor da mensalidade.", "error"); return; }
    if (!dataInicio || !dataFim) { showToast("Informe as datas de vigência.", "error"); return; }

    setLoading(true);
    try {
      const contrato = await contratosService.criar({
        aluno_ids: alunosSelecionados,
        contratante_id: Number(contratanteId),
        tipo,
        curso: curso.trim(),
        valor_mensalidade: parseFloat(valorMensalidade),
        desconto_percentual: tipoDesconto === "percentual" && descontoPercentual ? parseFloat(descontoPercentual) : undefined,
        desconto_valor: tipoDesconto === "valor" && descontoValor ? parseFloat(descontoValor) : undefined,
        dia_vencimento: parseInt(diaVencimento) || 10,
        valor_reposicao_hora: parseFloat(valorReposicao) || 35,
        data_inicio: dataInicio,
        data_fim: dataFim,
        local_assinatura: localAssinatura || undefined,
        observacoes: observacoes || undefined,
      });
      showToast("Contrato criado com sucesso!");
      router.push(`/admin/contratos/${contrato.id}`);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar contrato."), "error");
    } finally {
      setLoading(false);
    }
  }

  const alunoOptions = alunos
    .filter((a) => !alunosSelecionados.includes(a.pessoa_id))
    .map((a) => ({ value: a.pessoa_id, label: a.pessoa.nome }));
  const pessoaOptions = pessoas.map((p) => ({ value: p.id, label: p.nome }));

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Novo Contrato {tipo === "informal" ? "Informal" : "Formal"}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Multi-aluno */}
        <Field label="Aluno(s) *">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Combobox
                options={alunoOptions}
                value={alunoInput}
                onChange={handleAddAluno}
                placeholder="Adicionar aluno..."
              />
            </div>
            {alunosSelecionadosObj.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {alunosSelecionadosObj.map((a) => (
                  <span key={a.pessoa_id} className="flex items-center gap-1.5 bg-primary-100 text-primary-700 text-sm px-3 py-1 rounded-full">
                    {a.pessoa.nome}
                    <button type="button" onClick={() => handleRemoveAluno(a.pessoa_id)} className="text-primary-500 hover:text-primary-800 font-bold leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Field>

        <Field label="Contratante * (responsável ou o próprio aluno)">
          <Combobox options={pessoaOptions} value={contratanteId} onChange={setContratanteId} placeholder="Buscar contratante..." />
        </Field>

        <Field label="Modalidade *">
          <Input value={curso} onChange={(e) => setCurso(e.target.value)} placeholder="Ex: Individual, Dupla, Grupo..." required />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Mensalidade (R$) *">
            <Input type="number" step="0.01" min="0" value={valorMensalidade} onChange={(e) => setValorMensalidade(e.target.value)} placeholder="0.00" required />
          </Field>
          <Field label="Desconto">
            <div className="flex gap-1">
              <div className="flex rounded-md border border-border overflow-hidden text-sm shrink-0">
                <button type="button" onClick={() => setTipoDesconto("percentual")} className={`px-3 py-2 transition-colors ${tipoDesconto === "percentual" ? "bg-primary-600 text-white" : "bg-surface text-muted hover:bg-border"}`}>%</button>
                <button type="button" onClick={() => setTipoDesconto("valor")} className={`px-3 py-2 transition-colors ${tipoDesconto === "valor" ? "bg-primary-600 text-white" : "bg-surface text-muted hover:bg-border"}`}>R$</button>
              </div>
              {tipoDesconto === "percentual"
                ? <Input type="number" step="0.01" min="0" max="100" value={descontoPercentual} onChange={(e) => setDescontoPercentual(e.target.value)} placeholder="0" />
                : <Input type="number" step="0.01" min="0" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} placeholder="0.00" />
              }
            </div>
          </Field>
        </div>

        {valorComDesconto !== null && (
          <p className="text-sm text-primary-600 font-medium">
            Valor com desconto: {valorComDesconto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Dia de vencimento">
            <Input type="number" min="1" max="28" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} />
          </Field>
          <Field label="Valor reposição/hora (R$)">
            <Input type="number" step="0.01" min="0" value={valorReposicao} onChange={(e) => setValorReposicao(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Data início *">
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
          </Field>
          <Field label="Data fim *">
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} required />
          </Field>
        </div>

        <Field label="Local de assinatura">
          <Input value={localAssinatura} onChange={(e) => setLocalAssinatura(e.target.value)} />
        </Field>

        <Field label="Observações">
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            placeholder="Informações adicionais..."
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
