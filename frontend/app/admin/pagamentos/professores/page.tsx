"use client";
import { useEffect, useRef, useState } from "react";
import { pagamentosProfessoresService, type PagamentoProfessor } from "@/services/admin/pagamentos";
import { professoresService, type Professor } from "@/services/admin/professores";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { useToast } from "@/context/ToastContext";

const FORMA_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "ted", label: "TED" },
  { value: "dinheiro", label: "Dinheiro" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-foreground mb-1">{label}</label>{children}</div>;
}

export default function PagamentosProfessoresPage() {
  const { showToast } = useToast();

  const [pagamentos, setPagamentos] = useState<PagamentoProfessor[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterProfessorId, setFilterProfessorId] = useState<number | string | null>(null);
  const [filterReferencia, setFilterReferencia] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createProfessorId, setCreateProfessorId] = useState<number | string | null>(null);
  const [createReferencia, setCreateReferencia] = useState("");
  const [createValor, setCreateValor] = useState("");
  const [createAulas, setCreateAulas] = useState("");
  const [calculando, setCalculando] = useState(false);
  const [creating, setCreating] = useState(false);

  // Pagar modal
  const [pagarTarget, setPagarTarget] = useState<PagamentoProfessor | null>(null);
  const [pagarForma, setPagarForma] = useState("pix");
  const [pagarData, setPagarData] = useState(new Date().toISOString().split("T")[0]);
  const [pagando, setPagando] = useState(false);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Parameters<typeof pagamentosProfessoresService.listar>[0] = {};
      if (filterProfessorId) params.professor_id = Number(filterProfessorId);
      if (filterReferencia) params.referencia = filterReferencia;
      setPagamentos(await pagamentosProfessoresService.listar(params));
    } finally { setLoading(false); }
  }

  useEffect(() => {
    professoresService.listar().then(setProfessores);
    load();
  }, []);

  async function handleCalcular() {
    if (!createProfessorId || !createReferencia) { showToast("Selecione professor e referência.", "error"); return; }
    setCalculando(true);
    try {
      const result = await pagamentosProfessoresService.calcular(Number(createProfessorId), createReferencia);
      setCreateValor(String(result.valor_calculado));
      setCreateAulas(String(result.aulas_realizadas));
      showToast(`${result.aulas_realizadas} aulas × R$ ${result.valor_por_aula} = R$ ${result.valor_calculado}`);
    } catch (err: any) {
      showToast(err.message ?? "Erro ao calcular.", "error");
    } finally { setCalculando(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createProfessorId || !createReferencia || !createValor) { showToast("Preencha todos os campos.", "error"); return; }
    setCreating(true);
    try {
      await pagamentosProfessoresService.criar({
        professor_id: Number(createProfessorId),
        referencia: createReferencia,
        valor_total: Number(createValor),
        aulas_realizadas_snapshot: createAulas ? Number(createAulas) : undefined,
      });
      showToast("Pagamento registrado!");
      setShowCreate(false);
      setCreateProfessorId(null);
      setCreateReferencia("");
      setCreateValor("");
      setCreateAulas("");
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao registrar.", "error");
    } finally { setCreating(false); }
  }

  async function handlePagar(e: React.FormEvent) {
    e.preventDefault();
    if (!pagarTarget) return;
    setPagando(true);
    try {
      await pagamentosProfessoresService.atualizar(pagarTarget.id, {
        forma: pagarForma,
        data_pagamento: pagarData,
      });
      showToast("Pagamento confirmado!");
      setPagarTarget(null);
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao confirmar.", "error");
    } finally { setPagando(false); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    setUploading(true);
    try {
      await pagamentosProfessoresService.uploadComprovante(uploadTarget, file);
      showToast("Comprovante enviado!");
      setUploadTarget(null);
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao enviar.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function triggerUpload(id: number) {
    setUploadTarget(id);
    fileInputRef.current?.click();
  }

  const professorOptions = professores.map((p) => ({ value: p.pessoa_id, label: p.pessoa.nome }));

  const selectedProfessor = professores.find((p) => p.pessoa_id === Number(createProfessorId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Pagamentos de Professores</h1>
        <Button onClick={() => setShowCreate(true)}>+ Registrar Pagamento</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-surface border border-border rounded-xl p-4">
        <div className="w-52">
          <label className="block text-xs text-muted mb-1">Professor</label>
          <Combobox options={professorOptions} value={filterProfessorId} onChange={setFilterProfessorId} placeholder="Todos" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Referência (MM/AAAA)</label>
          <Input value={filterReferencia} onChange={(e) => setFilterReferencia(e.target.value)} placeholder="01/2025" className="w-32" />
        </div>
        <Button variant="outline" onClick={load}>Filtrar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<PagamentoProfessor>
          keyExtractor={(p) => p.id}
          data={pagamentos}
          columns={[
            { header: "Professor", render: (p) => p.professor_nome_snapshot },
            { header: "Contrato", render: (p) => <Badge variant="primary">{p.tipo_contrato_snapshot.toUpperCase()}</Badge> },
            { header: "Referência", render: (p) => p.referencia },
            { header: "Aulas", render: (p) => p.aulas_realizadas_snapshot ?? "-" },
            { header: "Valor total", render: (p) => `R$ ${Number(p.valor_total).toFixed(2)}` },
            { header: "Forma", render: (p) => p.forma ? p.forma.toUpperCase() : <Badge variant="warning">Pendente</Badge> },
            { header: "Pago em", render: (p) => p.data_pagamento ? new Date(p.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR") : "-" },
            {
              header: "Ações",
              render: (p) => (
                <div className="flex gap-2">
                  {!p.data_pagamento && (
                    <Button size="sm" variant="outline" onClick={() => { setPagarTarget(p); setPagarForma("pix"); setPagarData(new Date().toISOString().split("T")[0]); }}>
                      Confirmar pagamento
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => triggerUpload(p.id)} disabled={uploading && uploadTarget === p.id}>
                    {p.comprovante_url ? "Reenviar" : "Comprovante"}
                  </Button>
                  {p.comprovante_url && (
                    <a href={p.comprovante_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm flex items-center">Ver</a>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={handleUpload} />

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Registrar Pagamento de Professor</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Professor *">
                <Combobox options={professorOptions} value={createProfessorId} onChange={setCreateProfessorId} placeholder="Selecionar professor..." />
              </Field>
              <Field label="Referência * (MM/AAAA)">
                <Input value={createReferencia} onChange={(e) => setCreateReferencia(e.target.value)} placeholder="01/2025" required />
              </Field>
              {selectedProfessor?.tipo_contrato === "pj" && (
                <div className="flex gap-2 items-end">
                  <Button type="button" variant="outline" size="sm" onClick={handleCalcular} loading={calculando}>Calcular</Button>
                  {createAulas && (
                    <p className="text-sm text-muted pb-2">{createAulas} aulas realizadas no mês</p>
                  )}
                </div>
              )}
              <Field label="Valor total (R$) *">
                <Input type="number" step="0.01" min="0" value={createValor} onChange={(e) => setCreateValor(e.target.value)} placeholder="0.00" required />
              </Field>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>Cancelar</Button>
                <Button type="submit" loading={creating}>Registrar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pagar modal */}
      {pagarTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setPagarTarget(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Confirmar Pagamento — {pagarTarget.professor_nome_snapshot}</h2>
            <p className="text-sm text-muted mb-4">Valor: <strong className="text-foreground">R$ {Number(pagarTarget.valor_total).toFixed(2)}</strong></p>
            <form onSubmit={handlePagar} className="space-y-4">
              <Field label="Forma de pagamento">
                <Select options={FORMA_OPTIONS} value={pagarForma} onChange={(e) => setPagarForma(e.target.value)} />
              </Field>
              <Field label="Data do pagamento">
                <Input type="date" value={pagarData} onChange={(e) => setPagarData(e.target.value)} required />
              </Field>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setPagarTarget(null)} disabled={pagando}>Cancelar</Button>
                <Button type="submit" loading={pagando}>Confirmar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
