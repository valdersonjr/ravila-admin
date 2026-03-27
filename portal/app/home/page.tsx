"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Flame, MailX } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { RaviCard } from "@/components/portal/RaviCard";
import { portalService, type ResumoPortal } from "@/services/portal";

const RAVI_GREETINGS = [
  { message: "Keep going! Você está no caminho certo.", sub: "Ravi acredita em você." },
  { message: "Every day is a new chance to learn!", sub: "Cada aula conta. Não perca a próxima." },
  { message: "Practice makes perfect!", sub: "Continue comparecendo e evoluindo." },
  { message: "You're doing great!", sub: "O Ravi está torcendo por você." },
];

function getRaviGreeting() {
  return RAVI_GREETINGS[new Date().getDay() % RAVI_GREETINGS.length];
}

function formatData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  const semana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  if (d.getTime() === hoje.getTime()) return "Hoje";
  if (d.getTime() === amanha.getTime()) return "Amanhã";
  return `${semana[d.getDay()]}, ${dia}/${mes}`;
}

export default function HomePage() {
  const ravi = getRaviGreeting();
  const [resumo, setResumo] = useState<ResumoPortal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalService.resumo()
      .then(setResumo)
      .catch(() => setResumo({ streak_semanas: 0, proxima_aula: null }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell streak={resumo?.streak_semanas ?? 0}>
      <div className="px-5 py-6 space-y-4">

        <RaviCard message={ravi.message} sub={ravi.sub} />

        <section>
          <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Próxima aula</h2>
          {loading ? (
            <SkeletonCard />
          ) : resumo?.proxima_aula ? (
            <ProximaAulaCard aula={resumo.proxima_aula} />
          ) : (
            <EmptyAulaCard />
          )}
        </section>

        <section>
          <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Sua sequência</h2>
          {loading ? <SkeletonCard /> : <StreakCard semanas={resumo?.streak_semanas ?? 0} />}
        </section>

      </div>
    </AppShell>
  );
}

function ProximaAulaCard({ aula }: { aula: NonNullable<ResumoPortal["proxima_aula"]> }) {
  return (
    <div className="bg-surface border border-primary-200 rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-600 flex flex-col items-center justify-center text-white shrink-0">
          <span className="text-xs font-bold leading-none">{aula.data.split("-")[2]}</span>
          <span className="text-xs leading-none opacity-80">
            {["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][Number(aula.data.split("-")[1]) - 1]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{formatData(aula.data)}</p>
          <p className="text-sm text-muted">{aula.hora_inicio.slice(0, 5)} – {aula.hora_fim.slice(0, 5)}</p>
          {aula.turma_nome && (
            <p className="text-xs text-primary-600 font-medium mt-1 truncate">{aula.turma_nome}</p>
          )}
          <p className="text-xs text-muted mt-0.5 truncate">Prof. {aula.professor_nome}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyAulaCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-border flex items-center justify-center shrink-0">
        <MailX size={20} strokeWidth={1.75} className="text-muted" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Nenhuma aula agendada</p>
        <p className="text-xs text-muted mt-0.5">Fale com a secretaria para mais informações</p>
      </div>
    </div>
  );
}

function StreakCard({ semanas }: { semanas: number }) {
  if (semanas === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 flex items-center gap-4">
        <Flame size={32} strokeWidth={1.5} className="text-muted shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Comece sua sequência!</p>
          <p className="text-xs text-muted mt-0.5">Compareça às aulas e construa um streak incrível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-primary-100 rounded-2xl p-5 flex items-center gap-4">
      <Flame size={32} strokeWidth={1.5} className="text-primary-500 shrink-0" />
      <div>
        <p className="text-foreground leading-none">
          <span className="text-2xl font-black text-primary-600">{semanas}</span>
          <span className="text-base font-bold text-primary-600"> semanas</span>
        </p>
        <p className="text-xs text-muted mt-1">consecutivas de presença</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-border shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-border rounded w-1/3" />
          <div className="h-3 bg-border rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
