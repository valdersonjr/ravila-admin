"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, CalendarDays, CircleDollarSign } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { portalService, ContratoPortal } from "@/services/portal";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ativo:     { label: "Ativo",     color: "bg-emerald-100 text-emerald-700" },
  encerrado: { label: "Encerrado", color: "bg-slate-100 text-slate-500" },
  suspenso:  { label: "Suspenso",  color: "bg-amber-100 text-amber-700" },
  pendente:  { label: "Pendente",  color: "bg-rose-100 text-rose-600" },
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MeuContratoPage() {
  const router = useRouter();
  const [contratos, setContratos] = useState<ContratoPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    portalService
      .contratos()
      .then(setContratos)
      .catch(() => setErro("Não foi possível carregar os contratos."))
      .finally(() => setLoading(false));
  }, []);

  async function handleDownload(id: number) {
    setDownloading(id);
    try {
      const { url } = await portalService.downloadContrato(id);
      window.open(url, "_blank");
    } catch {
      setErro("Erro ao gerar link de download.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <AppShell>
      <div className="px-5 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted hover:text-foreground transition-colors">
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
          <h1 className="text-xl font-black text-foreground">Meu contrato</h1>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-border animate-pulse" />
            ))}
          </div>
        )}

        {!loading && erro && (
          <p className="text-sm text-rose-600">{erro}</p>
        )}

        {!loading && !erro && contratos.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText size={40} strokeWidth={1.25} className="text-muted" />
            <p className="text-sm font-semibold text-foreground">Nenhum contrato encontrado</p>
            <p className="text-xs text-muted">Seu contrato aparecerá aqui assim que for cadastrado.</p>
          </div>
        )}

        {!loading && contratos.map((c) => {
          const st = STATUS_LABEL[c.status] ?? { label: c.status, color: "bg-border text-muted" };
          const valorFinal = c.desconto_valor != null
            ? c.valor_mensalidade - c.desconto_valor
            : c.desconto_percentual != null
              ? c.valor_mensalidade * (1 - c.desconto_percentual / 100)
              : c.valor_mensalidade;

          const diasRestantes = (() => {
            if (c.status !== "ativo") return null;
            const fim = new Date(c.data_fim + "T00:00:00");
            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          })();

          return (
            <div key={c.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-foreground">{c.curso}</p>
                  <p className="text-xs text-muted mt-0.5">{c.tipo}</p>
                </div>
                <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 shrink-0 ${st.color}`}>
                  {st.label}
                </span>
              </div>

              {/* Info grid */}
              <div className="px-5 py-4 space-y-3">
                <Row
                  Icon={CalendarDays}
                  label="Vigência"
                  value={`${fmtDate(c.data_inicio)} – ${fmtDate(c.data_fim)}`}
                />
                <Row
                  Icon={CircleDollarSign}
                  label="Mensalidade"
                  value={
                    <span>
                      {fmtBRL(valorFinal)}
                      {c.desconto_percentual != null && (
                        <span className="ml-2 text-xs text-emerald-600 font-semibold">
                          -{c.desconto_percentual}% desc.
                        </span>
                      )}
                      {c.desconto_valor != null && (
                        <span className="ml-2 text-xs text-emerald-600 font-semibold">
                          -{fmtBRL(c.desconto_valor)} desc.
                        </span>
                      )}
                    </span>
                  }
                />
                <p className="text-xs text-muted">
                  Vencimento todo dia <strong className="text-foreground">{c.dia_vencimento}</strong>
                </p>
              </div>

              {/* Alerta de expiração */}
              {diasRestantes !== null && diasRestantes <= 30 && (
                <div className="px-5 pb-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                    <span className="text-amber-500 text-sm leading-none">⚠</span>
                    <p className="text-xs text-amber-800 font-medium">
                      {diasRestantes <= 0
                        ? "Contrato expirado."
                        : `Contrato expira em ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""}.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Download */}
              {c.tem_assinado && (
                <div className="px-5 pb-4">
                  <button
                    onClick={() => handleDownload(c.id)}
                    disabled={downloading === c.id}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                  >
                    <Download size={16} strokeWidth={2} />
                    {downloading === c.id ? "Gerando link..." : "Baixar contrato assinado"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function Row({
  Icon,
  label,
  value,
}: {
  Icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} strokeWidth={1.75} className="text-muted mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted leading-none">{label}</p>
        <div className="text-sm font-medium text-foreground mt-0.5">{value}</div>
      </div>
    </div>
  );
}
