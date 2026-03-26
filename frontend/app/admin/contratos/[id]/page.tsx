"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { contratosService, type Contrato } from "@/services/admin/contratos";
import { getErrorMessage } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";

const statusVariant: Record<string, "success" | "warning" | "neutral"> = {
  ativo: "success",
  rascunho: "warning",
  encerrado: "neutral",
  rescindido: "neutral",
};

function formatBRL(valor: string | number) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function diasRestantes(dataFim: string): number {
  const fim = new Date(dataFim + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <span className="text-xs text-muted font-medium w-44 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value ?? "—"}</span>
    </div>
  );
}

export default function ContratoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ status: Contrato["status"]; label: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  useEffect(() => {
    contratosService.buscar(Number(id))
      .then(setContrato)
      .catch(() => router.push("/admin/contratos"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDownloadPdf() {
    setPdfLoading(true);
    try {
      const blob = await contratosService.pdf(contrato!.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const nomeContratante = contrato!.contratante.nome.replace(/\s+/g, "_");
      a.download = `${nomeContratante}_contrato_${contrato!.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao gerar PDF."), "error");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contrato) return;
    setUploadLoading(true);
    try {
      const updated = await contratosService.uploadAssinado(contrato.id, file);
      setContrato(updated);
      showToast("Contrato assinado enviado com sucesso!");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao enviar arquivo."), "error");
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  }

  async function handleDownloadAssinado() {
    if (!contrato) return;
    setDownloadLoading(true);
    try {
      const blob = await contratosService.downloadAssinado(contrato.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = contrato.contrato_assinado_key?.split(".").pop() ?? "pdf";
      const nome = contrato.contratante.nome.replace(/\s+/g, "_");
      a.download = `contrato_${contrato.id}_${nome}_${contrato.data_inicio}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao baixar arquivo."), "error");
    } finally {
      setDownloadLoading(false);
    }
  }

  async function handleStatusChange(novoStatus: Contrato["status"]) {
    if (!contrato) return;
    setActionLoading(true);
    try {
      const updated = await contratosService.atualizarStatus(contrato.id, novoStatus);
      setContrato(updated);
      showToast(`Contrato ${novoStatus} com sucesso!`);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar status."), "error");
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }
  if (!contrato) return null;

  const valorComDesconto = (() => {
    const v = Number(contrato.valor_mensalidade);
    if (contrato.desconto_percentual) return v * (1 - Number(contrato.desconto_percentual) / 100);
    if (contrato.desconto_valor) return Math.max(v - Number(contrato.desconto_valor), 0);
    return null;
  })();

  const dias = contrato.status === "ativo" ? diasRestantes(contrato.data_fim) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Contrato #{contrato.id}</h1>
          <Badge variant={statusVariant[contrato.status] ?? "neutral"}>{contrato.status}</Badge>
          {dias !== null && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dias <= 30 ? "bg-red-100 text-red-600" : dias <= 90 ? "bg-amber-100 text-amber-600" : "bg-surface text-muted border border-border"}`}>
              {dias > 0 ? `Expira em ${dias} dia${dias !== 1 ? "s" : ""}` : dias === 0 ? "Expira hoje" : `Expirado há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? "s" : ""}`}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" loading={pdfLoading} onClick={handleDownloadPdf}>
            Baixar PDF
          </Button>
          {contrato.status === "rascunho" && (
            <>
              <Link href={`/admin/contratos/${contrato.id}/editar`}>
                <Button variant="outline" size="sm">Editar</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setConfirmModal({ status: "ativo", label: "ativar" })}>
                Ativar contrato
              </Button>
            </>
          )}
          {contrato.status === "ativo" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirmModal({ status: "encerrado", label: "encerrar" })}>
                Encerrar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmModal({ status: "rescindido", label: "rescindir" })}>
                Rescindir
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Alunos */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Aluno(s)</h2>
        <div className="flex flex-wrap gap-2">
          {contrato.alunos.map((a) => (
            <Link key={a.pessoa_id} href={`/admin/alunos/${a.pessoa_id}`}>
              <span className="bg-primary-100 text-primary-700 text-sm px-3 py-1 rounded-full font-medium hover:bg-primary-200 transition-colors cursor-pointer">
                {a.pessoa.nome}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Grid 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contratante */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Contratante</h2>
          <div className="space-y-3">
            <InfoRow label="Nome" value={contrato.contratante.nome} />
            <InfoRow label="CPF" value={contrato.contratante.cpf ?? "—"} />
            <InfoRow label="Endereço" value={contrato.contratante.endereco ?? "—"} />
            <InfoRow label="Telefone" value={contrato.contratante.telefone ?? "—"} />
          </div>
        </div>

        {/* Serviço & Valores */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Serviço & Valores</h2>
          <div className="space-y-3">
            <InfoRow label="Modalidade" value={contrato.curso} />
            <InfoRow label="Mensalidade" value={formatBRL(contrato.valor_mensalidade)} />
            {(contrato.desconto_percentual || contrato.desconto_valor) && (
              <>
                <InfoRow label="Desconto" value={contrato.desconto_percentual ? `${contrato.desconto_percentual}%` : formatBRL(contrato.desconto_valor!)} />
                <InfoRow label="Com desconto" value={<span className="font-medium text-primary-600">{formatBRL(valorComDesconto!)}</span>} />
              </>
            )}
            <InfoRow label="Vencimento" value={`Todo dia ${contrato.dia_vencimento}`} />
            <InfoRow label="Reposição / hora" value={formatBRL(contrato.valor_reposicao_hora)} />
          </div>
        </div>

        {/* Vigência & Assinatura */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Vigência & Assinatura</h2>
          <div className="space-y-3">
            <InfoRow label="Início" value={formatDate(contrato.data_inicio)} />
            <InfoRow label="Fim" value={formatDate(contrato.data_fim)} />
            <InfoRow label="Local" value={contrato.local_assinatura ?? "—"} />
          </div>
        </div>

        {/* Observações */}
        {contrato.observacoes && (
          <div className="bg-surface border border-border rounded-xl p-6 space-y-2">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Observações</h2>
            <p className="text-sm text-foreground whitespace-pre-wrap">{contrato.observacoes}</p>
          </div>
        )}
      </div>

      {/* Contrato assinado — rascunho: upload + download; outros status: só download se existir */}
      {(contrato.status === "rascunho" || contrato.status === "encerrado" || contrato.status === "rescindido") ? (
        <div className={`border rounded-xl p-6 space-y-3 ${contrato.contrato_assinado_key ? "bg-surface border-border" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Contrato Assinado</h2>
              <p className="text-xs text-muted mt-1">
                {contrato.contrato_assinado_key
                  ? contrato.status === "rascunho" ? "Arquivo enviado. O contrato pode ser ativado." : "Arquivo enviado."
                  : contrato.status === "rascunho" ? "Envie o contrato assinado para poder ativá-lo." : "Envie o contrato assinado para arquivamento."}
              </p>
            </div>
            {contrato.contrato_assinado_key && (
              <Button variant="outline" size="sm" loading={downloadLoading} onClick={handleDownloadAssinado}>
                Baixar assinado
              </Button>
            )}
          </div>
          <label className={`inline-flex items-center gap-2 cursor-pointer text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${uploadLoading ? "opacity-50 pointer-events-none" : ""} border-border bg-background hover:bg-surface`}>
            {uploadLoading ? "Enviando..." : contrato.contrato_assinado_key ? "Substituir arquivo" : "Fazer upload"}
            <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleUpload} disabled={uploadLoading} />
          </label>
        </div>
      ) : contrato.contrato_assinado_key ? (
        <div className="bg-surface border border-border rounded-xl p-6 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Contrato Assinado</h2>
            <p className="text-xs text-muted mt-1">Arquivo disponível para download.</p>
          </div>
          <Button variant="outline" size="sm" loading={downloadLoading} onClick={handleDownloadAssinado}>
            Baixar assinado
          </Button>
        </div>
      ) : null}

      {confirmModal && (
        <Modal
          title={`Confirmar: ${confirmModal.label} contrato`}
          message={`Tem certeza que deseja ${confirmModal.label} este contrato? Esta ação não pode ser desfeita.`}
          onConfirm={() => handleStatusChange(confirmModal.status)}
          onClose={() => setConfirmModal(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
