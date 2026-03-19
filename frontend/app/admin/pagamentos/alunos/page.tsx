"use client";
import { useEffect, useRef, useState } from "react";
import { pagamentosAlunosService, type PagamentoAluno } from "@/services/admin/pagamentos";
import { alunosService, type Aluno } from "@/services/admin/alunos";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { useToast } from "@/context/ToastContext";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "atrasado", label: "Atrasado" },
];

const FORMA_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-foreground mb-1">{label}</label>{children}</div>;
}

export default function PagamentosAlunosPage() {
  const { showToast } = useToast();

  const [pagamentos, setPagamentos] = useState<PagamentoAluno[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterAlunoId, setFilterAlunoId] = useState<number | string | null>(null);
  const [filterReferencia, setFilterReferencia] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createAlunoId, setCreateAlunoId] = useState<number | string | null>(null);
  const [createReferencia, setCreateReferencia] = useState("");
  const [createValor, setCreateValor] = useState("");
  const [creating, setCreating] = useState(false);

  // Pagar modal
  const [pagarTarget, setPagarTarget] = useState<PagamentoAluno | null>(null);
  const [pagarForma, setPagarForma] = useState("pix");
  const [pagarData, setPagarData] = useState(new Date().toISOString().split("T")[0]);
  const [pagando, setPagando] = useState(false);

  // Upload comprovante
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Parameters<typeof pagamentosAlunosService.listar>[0] = {};
      if (filterAlunoId) params.aluno_id = Number(filterAlunoId);
      if (filterReferencia) params.referencia = filterReferencia;
      if (filterStatus) params.status = filterStatus;
      setPagamentos(await pagamentosAlunosService.listar(params));
    } finally { setLoading(false); }
  }

  useEffect(() => {
    alunosService.listar().then(setAlunos);
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createAlunoId || !createReferencia || !createValor) { showToast("Preencha todos os campos.", "error"); return; }
    setCreating(true);
    try {
      await pagamentosAlunosService.criar({
        aluno_id: Number(createAlunoId),
        referencia: createReferencia,
        valor: Number(createValor),
      });
      showToast("Pagamento registrado!");
      setShowCreate(false);
      setCreateAlunoId(null);
      setCreateReferencia("");
      setCreateValor("");
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
      await pagamentosAlunosService.atualizar(pagarTarget.id, {
        status: "pago",
        forma: pagarForma,
        data_pagamento: pagarData,
      });
      showToast("Pagamento marcado como pago!");
      setPagarTarget(null);
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao marcar como pago.", "error");
    } finally { setPagando(false); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    setUploading(true);
    try {
      await pagamentosAlunosService.uploadComprovante(uploadTarget, file);
      showToast("Comprovante enviado!");
      setUploadTarget(null);
      await load();
    } catch (err: any) {
      showToast(err.message ?? "Erro ao enviar comprovante.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function triggerUpload(id: number) {
    setUploadTarget(id);
    fileInputRef.current?.click();
  }

  const statusVariant: Record<string, "success" | "warning" | "error"> = {
    pago: "success",
    pendente: "warning",
    atrasado: "error",
  };

  const alunoOptions = alunos.map((a) => ({ value: a.pessoa_id, label: `${a.pessoa.nome} — ${a.pessoa.cpf}` }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Pagamentos de Alunos</h1>
        <Button onClick={() => setShowCreate(true)}>+ Registrar Pagamento</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-surface border border-border rounded-xl p-4">
        <div className="w-52">
          <label className="block text-xs text-muted mb-1">Aluno</label>
          <Combobox options={alunoOptions} value={filterAlunoId} onChange={setFilterAlunoId} placeholder="Todos os alunos" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Referência (MM/AAAA)</label>
          <Input value={filterReferencia} onChange={(e) => setFilterReferencia(e.target.value)} placeholder="01/2025" className="w-32" />
        </div>
        <div className="w-40">
          <label className="block text-xs text-muted mb-1">Status</label>
          <Select options={STATUS_OPTIONS} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} />
        </div>
        <Button variant="outline" onClick={load}>Filtrar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<PagamentoAluno>
          keyExtractor={(p) => p.id}
          data={pagamentos}
          columns={[
            { header: "Aluno", render: (p) => p.aluno_nome_snapshot },
            { header: "Referência", render: (p) => p.referencia },
            { header: "Valor", render: (p) => `R$ ${Number(p.valor).toFixed(2)}` },
            { header: "Status", render: (p) => <Badge variant={statusVariant[p.status] ?? "neutral"}>{p.status}</Badge> },
            { header: "Forma", render: (p) => p.forma ? p.forma.toUpperCase() : "-" },
            { header: "Pago em", render: (p) => p.data_pagamento ? new Date(p.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR") : "-" },
            {
              header: "Ações",
              render: (p) => (
                <div className="flex gap-2">
                  {p.status !== "pago" && (
                    <Button size="sm" variant="outline" onClick={() => { setPagarTarget(p); setPagarForma("pix"); setPagarData(new Date().toISOString().split("T")[0]); }}>
                      Marcar pago
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => triggerUpload(p.id)} disabled={uploading && uploadTarget === p.id}>
                    {p.comprovante_url ? "Reenviar comprovante" : "Comprovante"}
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
            <h2 className="text-lg font-semibold text-foreground mb-4">Registrar Pagamento</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Aluno *">
                <Combobox options={alunoOptions} value={createAlunoId} onChange={setCreateAlunoId} placeholder="Selecionar aluno..." />
              </Field>
              <Field label="Referência * (MM/AAAA)">
                <Input value={createReferencia} onChange={(e) => setCreateReferencia(e.target.value)} placeholder="01/2025" required />
              </Field>
              <Field label="Valor (R$) *">
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
            <h2 className="text-lg font-semibold text-foreground mb-4">Marcar como Pago — {pagarTarget.aluno_nome_snapshot}</h2>
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
