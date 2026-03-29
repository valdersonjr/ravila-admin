"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft, ClipboardList, Mic } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";

export default function ExerciciosPage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="px-5 pt-5 pb-2 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-foreground transition-colors">
          <ChevronLeft size={22} strokeWidth={1.75} />
        </button>
        <h1 className="text-xl font-black text-foreground">Prática</h1>
      </div>

      <div className="px-5 pt-4 space-y-3">
        <p className="text-xs text-muted">Como você quer praticar hoje?</p>

        <button
          onClick={() => router.push("/pratica/questoes")}
          className="w-full bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 text-left hover:border-primary-300 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
            <ClipboardList size={22} className="text-white" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Questões</p>
            <p className="text-xs text-muted mt-0.5">Questão do dia e banco livre de exercícios</p>
          </div>
        </button>

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
      </div>
    </AppShell>
  );
}
