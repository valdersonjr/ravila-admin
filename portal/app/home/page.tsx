"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, BookOpen, CheckCircle, ClipboardList, Flame, MailX, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { RaviCard } from "@/components/portal/RaviCard";
import { portalService, type ResumoPortal } from "@/services/portal";

const RAVI_GREETINGS = [
  { message: "Keep going! Você está no caminho certo.", sub: "Ravi acredita em você." },
  { message: "Every day is a new chance to learn!", sub: "Cada questão conta. Não pule a de hoje." },
  { message: "Practice makes perfect!", sub: "Continue praticando e evoluindo." },
  { message: "You're doing great!", sub: "O Ravi está torcendo por você." },
];

function getRaviGreeting() {
  return RAVI_GREETINGS[new Date().getDay() % RAVI_GREETINGS.length];
}

const FORMATO_DIA_SEMANA = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
const FORMATO_DATA_CURTA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

function parseDateLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function formatData(iso: string): string {
  const data = parseDateLocal(iso);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
  if (data.getTime() === hoje.getTime()) return "Hoje";
  if (data.getTime() === amanha.getTime()) return "Amanhã";
  const diaSemana = FORMATO_DIA_SEMANA.format(data);
  const dataFormatada = FORMATO_DATA_CURTA.format(data);
  return `${diaSemana}, ${dataFormatada}`;
}

export default function HomePage() {
  const router = useRouter();
  const ravi = getRaviGreeting();
  const [resumo, setResumo] = useState<ResumoPortal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalService.resumo()
      .then(setResumo)
      .catch(() => setResumo({ proxima_aula: null, streak_dias: 0, questao_respondida_hoje: false, nivel_atual: null }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell streak={resumo?.streak_dias ?? 0}>
      <div className="px-5 py-6 space-y-4">

        <RaviCard message={ravi.message} sub={ravi.sub} />

        {/* Questão do dia */}
        <section>
          <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Questão do dia</h2>
          {loading ? <SkeletonCard /> : (
            resumo?.nivel_atual ? (
              <button
                onClick={() => router.push("/praticar/questoes")}
                className="w-full bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 text-left"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${resumo.questao_respondida_hoje ? "bg-green-100" : "bg-primary-600"}`}>
                  {resumo.questao_respondida_hoje
                    ? <CheckCircle size={22} className="text-green-600" />
                    : <BookOpen size={22} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  {resumo.questao_respondida_hoje ? (
                    <>
                      <p className="text-sm font-bold text-foreground">Feita hoje!</p>
                      <p className="text-xs text-muted mt-0.5">
                        {resumo.streak_dias > 1
                          ? <span className="flex items-center gap-1"><Flame size={11} className="text-orange-500" />{resumo.streak_dias} dias seguidos</span>
                          : "Volte amanhã para a próxima"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-foreground">Responder agora</p>
                      <p className="text-xs text-muted mt-0.5">Sua questão do dia está esperando</p>
                    </>
                  )}
                </div>
                <ChevronRight size={16} className="text-muted shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => router.push("/praticar/proficiencia")}
                className="w-full bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                  <ClipboardList size={22} className="text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Fazer teste de proficiência</p>
                  <p className="text-xs text-muted mt-0.5">Necessário para liberar a questão do dia</p>
                </div>
                <ChevronRight size={16} className="text-muted shrink-0" />
              </button>
            )
          )}
        </section>

        {/* Próxima aula */}
        <section>
          <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Próxima aula</h2>
          {loading ? <SkeletonCard /> : (
            resumo?.proxima_aula ? (
              <div className="bg-surface border border-primary-200 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-600 flex flex-col items-center justify-center text-white shrink-0">
                    <span className="text-xs font-bold leading-none">{resumo.proxima_aula.data.split("-")[2]}</span>
                    <span className="text-xs leading-none opacity-80">
                      {new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(parseDateLocal(resumo.proxima_aula.data))}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{formatData(resumo.proxima_aula.data)}</p>
                    <p className="text-sm text-muted">{resumo.proxima_aula.hora_inicio.slice(0, 5)} – {resumo.proxima_aula.hora_fim.slice(0, 5)}</p>
                    {resumo.proxima_aula.turma_nome && (
                      <p className="text-xs text-primary-600 font-medium mt-1 truncate">{resumo.proxima_aula.turma_nome}</p>
                    )}
                    <p className="text-xs text-muted mt-0.5 truncate">Prof. {resumo.proxima_aula.professor_nome}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-2xl p-5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-border flex items-center justify-center shrink-0">
                  <MailX size={20} strokeWidth={1.75} className="text-muted" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nenhuma aula agendada</p>
                  <p className="text-xs text-muted mt-0.5">Fale com a secretaria para mais informações</p>
                </div>
              </div>
            )
          )}
        </section>

        {/* Nível atual */}
        {!loading && resumo?.nivel_atual && (
          <section>
            <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Seu nível</h2>
            <button
              onClick={() => router.push("/praticar/questoes")}
              className="w-full bg-surface border border-border rounded-2xl p-5 flex items-center gap-4 text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <span className="text-base font-black text-primary-600">{resumo.nivel_atual}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Nível {resumo.nivel_atual}</p>
                <p className="text-xs text-muted mt-0.5">Pratique no banco de questões para subir</p>
              </div>
              <ChevronRight size={16} className="text-muted shrink-0" />
            </button>
          </section>
        )}

      </div>
    </AppShell>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-border shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-border rounded w-1/3" />
          <div className="h-3 bg-border rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
