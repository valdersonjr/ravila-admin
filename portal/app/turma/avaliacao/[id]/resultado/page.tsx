"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { portalService, type ResultadoAvaliacao, type ResultadoQuestao } from "@/services/portal";

const SUBTIPO_MANUAL = new Set(["dissertativa", "redacao"]);
const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;

export default function ResultadoAvaliacaoPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [resultado, setResultado] = useState<ResultadoAvaliacao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalService.resultadoAvaliacao(id)
      .then(setResultado)
      .catch(() => setResultado(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <AppShell>
      <div className="flex justify-center items-center h-64">
        <span className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    </AppShell>
  );

  if (!resultado) return (
    <AppShell>
      <div className="px-5 py-10 text-center space-y-4">
        <p className="text-sm text-muted">Resultado não disponível.</p>
        <button onClick={() => router.push("/turma")}
          className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold">
          Voltar
        </button>
      </div>
    </AppShell>
  );

  const concluida = resultado.status === "concluida";
  const pendentes = resultado.questoes.filter((q) => !q.corrigida).length;
  const corrigidas = resultado.questoes.filter((q) => q.corrigida).length;
  const progressoPct = resultado.total_peso > 0
    ? Math.round((resultado.peso_corrigido / resultado.total_peso) * 100)
    : 0;

  const nota = concluida ? resultado.nota_final : resultado.nota_parcial;

  return (
    <AppShell>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => router.push("/turma")} className="text-muted hover:text-foreground">
          <ChevronLeft size={22} strokeWidth={1.75} />
        </button>
        <h1 className="text-base font-black text-foreground">Revisão da prova</h1>
      </div>

      <div className="px-5 space-y-5 pb-10">

        {/* Card de nota */}
        <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-3">
          {concluida ? (
            <>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest">Nota final</p>
              <p className="text-6xl font-black text-primary-600">{nota?.toFixed(1) ?? "—"}</p>
              <p className="text-xs text-muted">de 100 pontos</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-amber-600">
                <Clock size={18} />
                <p className="text-sm font-bold">Aguardando correção do professor</p>
              </div>

              {nota != null && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Nota parcial</p>
                  <p className="text-4xl font-black text-amber-600">{nota.toFixed(1)}</p>
                  <p className="text-xs text-amber-600">
                    Baseada nas {corrigidas} questão{corrigidas !== 1 ? "ões" : ""} já corrigidas
                  </p>
                </div>
              )}

              {/* Progresso de correção */}
              <div className="space-y-1.5 text-left">
                <div className="flex justify-between text-xs text-muted">
                  <span>{corrigidas} de {resultado.questoes.length} corrigidas</span>
                  <span>{progressoPct}% do peso avaliado</span>
                </div>
                <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all rounded-full"
                    style={{ width: `${progressoPct}%` }}
                  />
                </div>
              </div>

              {pendentes > 0 && (
                <p className="text-xs text-muted">
                  {pendentes} questão{pendentes !== 1 ? "ões" : ""} pendente{pendentes !== 1 ? "s" : ""} de correção manual
                </p>
              )}
            </>
          )}
        </div>

        {/* Questões */}
        <div className="space-y-4">
          {resultado.questoes.map((q, i) => (
            <QuestaoRevisao key={q.questao_id} q={q} numero={i + 1} />
          ))}
        </div>

        <button onClick={() => router.push("/turma")}
          className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold">
          Voltar para Turma
        </button>
      </div>
    </AppShell>
  );
}

function QuestaoRevisao({ q, numero }: { q: ResultadoQuestao; numero: number }) {
  const isManual = SUBTIPO_MANUAL.has(q.subtipo);
  const pendente = !q.corrigida;

  const borderColor = pendente
    ? "border-amber-200"
    : q.acertou === true
    ? "border-emerald-200"
    : q.acertou === false
    ? "border-rose-200"
    : "border-border";

  return (
    <div className={`bg-surface border rounded-2xl overflow-hidden ${borderColor}`}>
      {/* Cabeçalho da questão */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted">{numero}.</span>
          <span className="px-2 py-0.5 rounded-md bg-primary-100 text-primary-700 text-[11px] font-bold">{q.nivel}</span>
          <span className="text-xs text-muted">Peso {q.peso}</span>
        </div>

        {/* Badge de resultado */}
        {pendente ? (
          <div className="flex items-center gap-1 text-amber-600 shrink-0">
            <Clock size={14} />
            <span className="text-xs font-semibold">Pendente</span>
          </div>
        ) : q.acertou === true ? (
          <div className="flex items-center gap-1 text-emerald-600 shrink-0">
            <CheckCircle size={14} />
            <span className="text-xs font-semibold">Correto</span>
          </div>
        ) : q.acertou === false ? (
          <div className="flex items-center gap-1 text-rose-500 shrink-0">
            <XCircle size={14} />
            <span className="text-xs font-semibold">Incorreto</span>
          </div>
        ) : q.nota_manual != null ? (
          <div className="flex items-center gap-1 text-primary-600 shrink-0">
            <CheckCircle size={14} />
            <span className="text-xs font-bold">{Math.round(q.nota_manual * 10)}/10</span>
          </div>
        ) : null}
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Texto de apoio */}
        {q.texto_apoio && (
          <div className="bg-background border-l-4 border-primary-300 rounded-r-lg px-3 py-2 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
            {q.texto_apoio}
          </div>
        )}

        {/* Mídia */}
        {q.midia_url && (
          (q.midia_tipo === "image" || (!q.midia_tipo && IMAGE_EXTS.test(q.midia_url))) ? (
            <img src={q.midia_url} alt="Mídia" className="rounded-xl border border-border max-h-48 w-full object-contain bg-background" />
          ) : q.midia_tipo === "audio" ? (
            <audio controls src={q.midia_url} className="w-full" />
          ) : q.midia_tipo === "video" ? (
            <video controls src={q.midia_url} className="w-full rounded-xl border border-border max-h-48" />
          ) : null
        )}

        {/* Enunciado */}
        <p className="text-sm font-semibold text-foreground leading-relaxed">{q.enunciado}</p>

        {/* Alternativas (múltipla escolha) */}
        {q.subtipo === "multiple_choice" && q.alternativas && (
          <div className="space-y-1.5">
            {q.alternativas.map((alt) => {
              const isSelecionada = q.resposta_dada === alt;
              const isCorreta = q.resposta_correta === alt;
              return (
                <div key={alt} className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                  isCorreta
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : isSelecionada && !isCorreta
                    ? "bg-rose-50 border-rose-300 text-rose-800"
                    : "bg-background border-border text-foreground opacity-50"
                }`}>
                  {isCorreta && <CheckCircle size={12} className="text-emerald-600 shrink-0" />}
                  {isSelecionada && !isCorreta && <XCircle size={12} className="text-rose-500 shrink-0" />}
                  <span>{alt}</span>
                  {isCorreta && <span className="ml-auto text-[10px] font-bold text-emerald-700">correta</span>}
                  {isSelecionada && !isCorreta && <span className="ml-auto text-[10px] font-bold text-rose-600">sua resposta</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Resposta do aluno (dissertativa/fill_blanks) */}
        {q.subtipo !== "multiple_choice" && q.resposta_dada && (
          <div className="bg-background border border-border rounded-xl p-3 space-y-1">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wide">Sua resposta</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{q.resposta_dada}</p>
          </div>
        )}

        {/* Resposta correta (fill_blanks) */}
        {q.subtipo === "fill_blanks" && q.resposta_correta && q.acertou === false && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Resposta correta</p>
            <p className="text-sm font-semibold text-emerald-800">{q.resposta_correta}</p>
          </div>
        )}

        {/* Estado pendente (manual) */}
        {pendente && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">O professor irá avaliar esta resposta em breve.</p>
          </div>
        )}

        {/* Comentário do professor */}
        {q.comentario_professor && (
          <div className="border-t border-border pt-3 space-y-1">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wide">Comentário do professor</p>
            <p className="text-sm text-foreground italic">{q.comentario_professor}</p>
          </div>
        )}

        {/* Explicação — só mostra quando corrigida */}
        {q.corrigida && q.explicacao && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 space-y-1">
            <p className="text-[10px] font-bold text-primary-700 uppercase tracking-wide">Explicação</p>
            <p className="text-xs text-foreground leading-relaxed">{q.explicacao}</p>
          </div>
        )}
      </div>
    </div>
  );
}
