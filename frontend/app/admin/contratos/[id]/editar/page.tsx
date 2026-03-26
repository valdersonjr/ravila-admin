"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { contratosService } from "@/services/admin/contratos";
import { alunosService, type Aluno } from "@/services/admin/alunos";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { getErrorMessage } from "@/lib/utils";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";

export default function EditarContratoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

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
  const [localAssinatura, setLocalAssinatura] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    Promise.all([
      contratosService.buscar(Number(id)),
      alunosService.listar({ page_size: 500 }),
      pessoasService.listar({ page_size: 500 }),
    ]).then(([contrato, a, p]) => {
      setAlunos(a.items);
      setPessoas(p.items);
      setAlunosSelecionados(contrato.alunos.map((a) => a.pessoa_id));
      setContratanteId(contrato.contratante_id);
      setCurso(contrato.curso);
      setValorMensalidade(contrato.valor_mensalidade);
      if (contrato.desconto_valor) {
        setTipoDesconto("valor");
        setDescontoValor(contrato.desconto_valor);
      } else {
        setTipoDesconto("percentual");
        setDescontoPercentual(contrato.desconto_percentual ?? "");
      }
      setDiaVencimento(String(contrato.dia_vencimento));
      setValorReposicao(contrato.valor_reposicao_hora);
      setDataInicio(contrato.data_inicio);
      setDataFim(contrato.data_fim);
      setLocalAssinatura(contrato.local_assinatura ?? "");
      setObservacoes(contrato.observacoes ?? "");
    }).catch(() => router.push("/admin/contratos"))
      .finally(() => setLoadingData(false));
  }, [id]);

  function handleAddAluno(val: number | string | null) {
    if (!val) return;
    const pid = Number(val);
    if (alunosSelecionados.includes(pid)) return;
    setAlunosSelecionados((prev) => [...prev, pid]);
    setAlunoInput(null);
  }

  function handleRemoveAluno(pid: number) {
    setAlunosSelecionados((prev) => prev.filter((a) => a !== pid));
  }

  const alunosSelecionadosObj = alunosSelecionados
    .map((pid) => alunos.find((a) => a.pessoa_id === pid))
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
    if (!curso.trim()) { showToast("Informe a modalidade.", "error"); return; }
    if (!valorMensalidade) { showToast("Informe o valor da mensalidade.", "error"); return; }
    if (!dataInicio || !dataFim) { showToast("Informe as datas de vigência.", "error"); return; }

    setSaving(true);
    try {
      await contratosService.atualizar(Number(id), {
        aluno_ids: alunosSelecionados,
        contratante_id: Number(contratanteId),
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
      showToast("Contrato atualizado com sucesso!");
      router.push(`/admin/contratos/${id}`);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar contrato."), "error");
    } finally {
      setSaving(false);
    }
  }

  const alunoOptions = alunos
    .filter((a) => !alunosSelecionados.includes(a.pessoa_id))
    .map((a) => ({ value: a.pessoa_id, label: a.pessoa.nome }));
  const pessoaOptions = pessoas.map((p) => ({ value: p.id, label: p.nome }));

  if (loadingData) {
    return <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Editar Contrato #{id}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">

        <Field label="Aluno(s) *">
          <div className="space-y-2">
            <Combobox options={alunoOptions} value={alunoInput} onChange={handleAddAluno} placeholder="Adicionar aluno..." />
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
          <Input value={localAssinatura} onChange={(e) => setLocalAssinatura(e.target.value)} placeholder="Ex: Goianésia – GO" />
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
          <Button type="submit" loading={saving}>Salvar alterações</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
