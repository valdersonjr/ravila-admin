"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Mic, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { portalService, type NivelProgresso } from "@/services/portal";

export default function PraticarPage() {
  const router = useRouter();
  const [progresso, setProgresso] = useState<NivelProgresso | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalService.nivelProgresso()
      .then(setProgresso)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const temNivel = !!progresso?.nivel_atual;

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-xl font-black text-foreground">Praticar</h1>
        <p className="text-xs text-muted mt-1">O que você quer fazer hoje?</p>
      </div>

      <div className="px-5 pt-4 space-y-3">

        {/* Progresso de nível */}
        {!loading && progresso?.nivel_atual && progresso.total_respondidas >= 5 && (
          <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3">
            <TrendingUp size={18} className="text-primary-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted">Desempenho em {progresso.nivel_atual}</p>
              <p className="text-sm font-bold text-foreground">{progresso.percentual}% de acerto nas últimas questões</p>
            </div>
          </div>
        )}

        {/* Teste de proficiência — destaque se não tiver nível */}
        {!loading && !temNivel && (
          <button
            onClick={() => router.push("/praticar/proficiencia")}
            className="w-full bg-primary-600 rounded-2xl p-5 flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ClipboardList size={22} className="text-white" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Fazer teste de proficiência</p>
              <p className="text-xs text-white/70 mt-0.5">Necessário para liberar as questões</p>
            </div>
          </button>
        )}

        {/* Questões */}
        <button
          onClick={() => router.push("/praticar/questoes")}
          disabled={!temNivel && !loading}
          className="w-full bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 text-left hover:border-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${temNivel ? "bg-primary-600" : "bg-border"}`}>
            <ClipboardList size={22} className={temNivel ? "text-white" : "text-muted"} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Questões</p>
            <p className="text-xs text-muted mt-0.5">Questão do dia e banco livre por nível</p>
          </div>
        </button>

        {/* Chat por voz — em breve */}
        <div className="w-full bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 opacity-50 cursor-not-allowed">
          <div className="w-12 h-12 rounded-xl bg-border flex items-center justify-center shrink-0">
            <Mic size={22} className="text-muted" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">Chat por voz</p>
              <span className="text-[10px] bg-border text-muted rounded-full px-2 py-0.5 font-semibold">em breve</span>
            </div>
            <p className="text-xs text-muted mt-0.5">Pratique conversação com correção de pronúncia</p>
          </div>
        </div>

        {/* Teste de proficiência — acessível mesmo quem já tem nível */}
        {!loading && temNivel && (
          <button
            onClick={() => router.push("/praticar/proficiencia")}
            className="w-full bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 text-left hover:border-primary-300 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <span className="text-base font-black text-primary-600">{progresso?.nivel_atual}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Meu nível: {progresso?.nivel_atual}</p>
              <p className="text-xs text-muted mt-0.5">Ver detalhes do teste de proficiência</p>
            </div>
          </button>
        )}

      </div>
    </AppShell>
  );
}
