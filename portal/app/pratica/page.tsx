"use client";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";

export default function AprenderPage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="px-5 pt-5 pb-2">
        <h1 className="text-xl font-black text-foreground">Aprender</h1>
        <p className="text-xs text-muted mt-1">O que você quer fazer hoje?</p>
      </div>

      <div className="px-5 pt-4 space-y-3">

        <div className="w-full bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 opacity-50 cursor-not-allowed">
          <div className="w-12 h-12 rounded-xl bg-border flex items-center justify-center shrink-0">
            <GraduationCap size={22} className="text-muted" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">Teoria</p>
              <span className="text-[10px] bg-border text-muted rounded-full px-2 py-0.5 font-semibold">em breve</span>
            </div>
            <p className="text-xs text-muted mt-0.5">Conteúdo explicativo por nível e tópico</p>
          </div>
        </div>

        <button
          onClick={() => router.push("/pratica/exercicios")}
          className="w-full bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 text-left hover:border-primary-300 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
            <BookOpen size={22} className="text-white" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Prática</p>
            <p className="text-xs text-muted mt-0.5">Exercícios, questões e desafios de conversação</p>
          </div>
        </button>

      </div>
    </AppShell>
  );
}
