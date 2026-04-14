"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ClipboardList, Target, ArrowUpCircle, CircleOff, TrendingUp, Trophy } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { portalService, type QuestaoPortal } from "@/services/portal";

const NIVEIS = ["A1", "A2", "B1", "B2", "C1", "C2"];

type Resposta = { questao_id: number; resposta_dada: string };

type Fase =
  | { tipo: "loading" }
  | { tipo: "ja_feito"; nivel: string }
  | { tipo: "intro" }
  | { tipo: "questao"; questoes: QuestaoPortal[]; indice: number; respostas: Resposta[] }
  | { tipo: "calculando" }
  | { tipo: "resultado"; nivel: string };

export default function ProficienciaPage() {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>({ tipo: "loading" });
  const [respostaAtual, setRespostaAtual] = useState("");

  useEffect(() => {
    portalService.statusTeste().then((s) => {
      if (s.concluido && s.nivel) {
        setFase({ tipo: "ja_feito", nivel: s.nivel });
      } else {
        setFase({ tipo: "intro" });
      }
    }).catch(() => setFase({ tipo: "intro" }));
  }, []);

  async function iniciar() {
    setFase({ tipo: "loading" });
    const lotes = await Promise.all(NIVEIS.map((n) => portalService.questoesProficiencia(n)));
    const questoes = lotes.flat();
    if (questoes.length === 0) {
      const res = await portalService.avaliarCompleto([]);
      setFase({ tipo: "resultado", nivel: res.nivel });
      return;
    }
    setFase({ tipo: "questao", questoes, indice: 0, respostas: [] });
    setRespostaAtual("");
  }

  async function confirmarResposta() {
    if (fase.tipo !== "questao" || !respostaAtual) return;
    const q = fase.questoes[fase.indice];
    const novasRespostas = [...fase.respostas, { questao_id: q.id, resposta_dada: respostaAtual }];

    if (fase.indice < fase.questoes.length - 1) {
      setFase({ ...fase, indice: fase.indice + 1, respostas: novasRespostas });
      setRespostaAtual("");
      return;
    }

    setFase({ tipo: "calculando" });
    const res = await portalService.avaliarCompleto(novasRespostas);
    setFase({ tipo: "resultado", nivel: res.nivel });
  }

  if (fase.tipo === "loading") {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <span className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (fase.tipo === "ja_feito") {
    return (
      <AppShell>
        <div className="px-5 py-8 space-y-6 text-center">
          <GraduationCap size={48} className="text-primary-600 mx-auto" />
          <div className="space-y-2">
            <p className="text-xl font-black text-foreground">Teste já realizado!</p>
            <p className="text-sm text-muted leading-relaxed px-4">
              Suas respostas já foram enviadas para análise do seu professor.
            </p>
          </div>
          <button onClick={() => router.push("/praticar")}
            className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold">
            Ir para Praticar
          </button>
        </div>
      </AppShell>
    );
  }

  if (fase.tipo === "intro") {
    return (
      <AppShell>
        <div className="px-5 py-8 space-y-6">
          <div className="text-center space-y-3">
            <ClipboardList size={48} className="text-primary-600 mx-auto" />
            <h1 className="text-2xl font-black text-foreground">Teste de Proficiência</h1>
            <p className="text-sm text-muted leading-relaxed">
              Responda com calma. Queremos entender onde você está<br />
              para te enviar as questões certas para o seu nível.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-muted uppercase tracking-widest">Como funciona</p>
            <div className="space-y-2 text-sm text-foreground">
              <div className="flex items-center gap-2"><Target size={14} className="text-primary-500 shrink-0" /><span>Algumas questões de diferentes temas</span></div>
              <div className="flex items-center gap-2"><ArrowUpCircle size={14} className="text-green-500 shrink-0" /><span>Cada resposta nos ajuda a calibrar seu nível</span></div>
              <div className="flex items-center gap-2"><CircleOff size={14} className="text-red-400 shrink-0" /><span>Não tente adivinhar, seja honesto com você mesmo</span></div>
              <div className="flex items-center gap-2"><TrendingUp size={14} className="text-primary-500 shrink-0" /><span>Você poderá subir de nível praticando depois</span></div>
            </div>
          </div>

          <button onClick={iniciar}
            className="w-full py-4 rounded-xl bg-primary-600 text-white text-base font-black">
            Começar teste
          </button>
        </div>
      </AppShell>
    );
  }

  if (fase.tipo === "questao") {
    const q = fase.questoes[fase.indice];
    const total = fase.questoes.length;
    const isUltima = fase.indice === total - 1;
    const progresso = ((fase.indice + (isUltima ? 1 : 0)) / total) * 100;

    return (
      <AppShell>
        <div className="px-5 py-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-medium">Questão {fase.indice + 1} de {total}</span>
              <span>{Math.round(progresso)}%</span>
            </div>
            <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 transition-all" style={{ width: `${progresso}%` }} />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground leading-relaxed">{q.enunciado}</p>

            {q.subtipo === "multiple_choice" && q.alternativas ? (
              <div className="space-y-2">
                {q.alternativas.map((alt) => (
                  <button key={alt} onClick={() => setRespostaAtual(alt)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      respostaAtual === alt
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-background text-foreground border-border"
                    }`}>
                    {alt}
                  </button>
                ))}
              </div>
            ) : (
              <input type="text" value={respostaAtual}
                onChange={(e) => setRespostaAtual(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmarResposta()}
                placeholder="Digite sua resposta..."
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
          </div>

          <button onClick={confirmarResposta} disabled={!respostaAtual}
            className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold disabled:opacity-40">
            {isUltima ? "Ver meu resultado" : "Próxima"}
          </button>
        </div>
      </AppShell>
    );
  }

  if (fase.tipo === "calculando") {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 gap-6 px-5 text-center">
          <span className="w-12 h-12 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
          <div className="space-y-1">
            <p className="text-base font-black text-foreground">Analisando suas respostas...</p>
            <p className="text-sm text-muted">Estamos encontrando o nível ideal para você</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (fase.tipo === "resultado") {
    return (
      <AppShell>
        <div className="px-5 py-10 space-y-6 text-center">
          <Trophy size={52} className="text-primary-600 mx-auto" />
          <div className="space-y-2">
            <p className="text-xl font-black text-foreground">Obrigado por realizar o teste!</p>
            <p className="text-sm text-muted leading-relaxed px-4">
              Suas respostas foram enviadas para análise do seu professor, que em breve entrará em contato com você.
            </p>
          </div>
          <button onClick={() => router.push("/praticar")}
            className="w-full py-4 rounded-xl bg-primary-600 text-white text-base font-black">
            Ir para Praticar
          </button>
        </div>
      </AppShell>
    );
  }

  return null;
}
