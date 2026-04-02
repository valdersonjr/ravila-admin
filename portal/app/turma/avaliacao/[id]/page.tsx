"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { portalService, type AvaliacaoDetalhePortal, type AvaliacaoQuestaoPortal } from "@/services/portal";

type Fase = "loading" | "erro" | "ja_respondida" | "fora_do_horario" | "respondendo" | "enviando" | "enviado";

function calcSecondsLeft(dataAplicacao: string | null, horaFim: string): number {
  const now = new Date();
  const fim = new Date(now);
  if (dataAplicacao) {
    const [y, m, d] = dataAplicacao.split("-").map(Number);
    fim.setFullYear(y, m - 1, d);
  }
  const [h, min, s] = horaFim.split(":").map(Number);
  fim.setHours(h, min, s ?? 0, 0);
  return Math.max(0, Math.floor((fim.getTime() - now.getTime()) / 1000));
}

function formatTimer(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ResponderAvaliacaoPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [fase, setFase] = useState<Fase>("loading");
  const [av, setAv] = useState<AvaliacaoDetalhePortal | null>(null);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [secsLeft, setSecsLeft] = useState<number | null>(null);
  const [horaFim, setHoraFim] = useState<string | null>(null);
  const [dataAplicacao, setDataAplicacao] = useState<string | null>(null);
  const submitRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    portalService.avaliacaoDetalhe(id)
      .then((data) => {
        setAv(data);
        setHoraFim(data.hora_fim);
        setDataAplicacao(data.data_aplicacao);
        setFase("respondendo");
      })
      .catch((err) => {
        if (err?.status === 409 || err?.detail === "ja_respondida") setFase("ja_respondida");
        else if (err?.status === 403 && err?.detail === "fora_do_horario") setFase("fora_do_horario");
        else setFase("erro");
      });
  }, [id]);

  // Timer — countdown
  useEffect(() => {
    if (!horaFim || fase !== "respondendo") return;
    setSecsLeft(calcSecondsLeft(dataAplicacao, horaFim));
    const interval = setInterval(() => {
      setSecsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          submitRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [horaFim, fase]);

  // Polling — verifica extensão de tempo a cada 30s
  useEffect(() => {
    if (fase !== "respondendo") return;
    const poll = setInterval(async () => {
      try {
        const h = await portalService.avaliacaoHorario(id);
        if (h.hora_fim && h.hora_fim !== horaFim) {
          setHoraFim(h.hora_fim);
          setDataAplicacao(h.data_aplicacao);
        }
      } catch { /* silencioso */ }
    }, 30_000);
    return () => clearInterval(poll);
  }, [fase, horaFim, id]);

  async function handleSubmit() {
    if (!av) return;
    const faltando = av.questoes.some((q) => !respostas[q.questao_id]?.trim());
    if (faltando && secsLeft !== 0) { alert("Responda todas as questões antes de enviar."); return; }
    setFase("enviando");
    try {
      await portalService.responderAvaliacao(id, av.questoes.map((q) => ({
        questao_id: q.questao_id,
        resposta_dada: respostas[q.questao_id] ?? "",
      })));
      setFase("enviado");
    } catch {
      setFase("respondendo");
      alert("Erro ao enviar. Tente novamente.");
    }
  }

  // Registra referência para auto-submit pelo timer
  submitRef.current = handleSubmit;

  if (fase === "loading") return (
    <AppShell>
      <div className="flex justify-center items-center h-64">
        <span className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    </AppShell>
  );

  if (fase === "ja_respondida") return (
    <AppShell>
      <div className="px-5 py-10 text-center space-y-4">
        <p className="text-lg font-black text-foreground">Você já respondeu esta avaliação.</p>
        <button onClick={() => router.push(`/turma/avaliacao/${id}/resultado`)}
          className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold">
          Ver resultado
        </button>
      </div>
    </AppShell>
  );

  if (fase === "fora_do_horario") return (
    <AppShell>
      <div className="px-5 py-10 text-center space-y-4">
        <p className="text-lg font-black text-foreground">Avaliação fora do horário</p>
        <p className="text-sm text-muted">Esta avaliação só pode ser respondida durante o horário previsto pelo professor.</p>
        <button onClick={() => router.push("/turma")}
          className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold">
          Voltar
        </button>
      </div>
    </AppShell>
  );

  if (fase === "erro") return (
    <AppShell>
      <div className="px-5 py-10 text-center space-y-4">
        <p className="text-sm text-muted">Avaliação não disponível.</p>
        <button onClick={() => router.push("/turma")}
          className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold">
          Voltar
        </button>
      </div>
    </AppShell>
  );

  if (fase === "enviado") return (
    <AppShell>
      <div className="px-5 py-10 text-center space-y-4">
        <p className="text-lg font-black text-foreground">Avaliação enviada!</p>
        <p className="text-sm text-muted">O professor irá corrigir em breve. Você será notificado quando a nota estiver disponível.</p>
        <button onClick={() => router.push("/turma")}
          className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold">
          Voltar para Turma
        </button>
      </div>
    </AppShell>
  );

  if (!av) return null;

  return (
    <AppShell>
      <div className="px-5 pt-5 pb-2 flex items-center gap-3">
        <button onClick={() => router.push("/turma")} className="text-muted hover:text-foreground">
          <ChevronLeft size={22} strokeWidth={1.75} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black text-foreground truncate">{av.titulo}</h1>
          {av.modulo && <p className="text-xs text-muted">{av.modulo}</p>}
        </div>
      </div>

      {/* Timer */}
      {secsLeft !== null && (
        <div className={`mx-5 mb-2 rounded-xl px-4 py-2.5 flex items-center justify-between ${
          secsLeft <= 60
            ? "bg-rose-50 border border-rose-200"
            : secsLeft <= 300
            ? "bg-amber-50 border border-amber-200"
            : "bg-surface border border-border"
        }`}>
          <span className={`text-xs font-semibold ${
            secsLeft <= 60 ? "text-rose-600" : secsLeft <= 300 ? "text-amber-600" : "text-muted"
          }`}>
            {secsLeft <= 60 ? "Tempo quase esgotado!" : secsLeft <= 300 ? "Pouco tempo restante" : "Tempo restante"}
          </span>
          <span className={`text-base font-black tabular-nums ${
            secsLeft <= 60 ? "text-rose-600" : secsLeft <= 300 ? "text-amber-600" : "text-foreground"
          }`}>
            {formatTimer(secsLeft)}
          </span>
        </div>
      )}

      {/* Progresso */}
      <div className="px-5 pb-3">
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>{Object.values(respostas).filter(Boolean).length} de {av.questoes.length} respondidas</span>
        </div>
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all"
            style={{ width: `${(Object.values(respostas).filter(Boolean).length / av.questoes.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-5 space-y-5 pb-8">
        {av.questoes.map((aq, i) => (
          <QuestaoCard
            key={aq.questao_id}
            numero={i + 1}
            aq={aq}
            resposta={respostas[aq.questao_id] ?? ""}
            onChange={(v) => setRespostas((p) => ({ ...p, [aq.questao_id]: v }))}
          />
        ))}

        <button
          onClick={handleSubmit}
          disabled={fase === "enviando"}
          className="w-full py-4 rounded-xl bg-primary-600 text-white text-base font-black disabled:opacity-40"
        >
          {fase === "enviando" ? "Enviando..." : "Enviar avaliação"}
        </button>
      </div>
    </AppShell>
  );
}

function QuestaoCard({
  numero, aq, resposta, onChange,
}: {
  numero: number;
  aq: AvaliacaoQuestaoPortal;
  resposta: string;
  onChange: (v: string) => void;
}) {
  const { questao } = aq;
  const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-muted">{numero}.</span>
        <span className="px-2 py-0.5 rounded-md bg-primary-100 text-primary-700 text-[11px] font-bold">{questao.nivel}</span>
        <span className="text-xs text-muted">Peso {aq.peso}</span>
      </div>

      {questao.texto_apoio && (
        <div className="bg-background border-l-4 border-primary-300 rounded-r-lg px-3 py-2 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
          {questao.texto_apoio}
        </div>
      )}

      {questao.midia_url && (
        (questao.midia_tipo === "image" || (!questao.midia_tipo && IMAGE_EXTS.test(questao.midia_url))) ? (
          <img src={questao.midia_url} alt="Mídia" className="rounded-xl border border-border max-h-52 w-full object-contain bg-background" />
        ) : questao.midia_tipo === "audio" ? (
          <audio controls src={questao.midia_url} className="w-full" />
        ) : questao.midia_tipo === "video" ? (
          <video controls src={questao.midia_url} className="w-full rounded-xl border border-border max-h-52" />
        ) : null
      )}

      <p className="text-sm font-semibold text-foreground leading-relaxed">{questao.enunciado}</p>

      {questao.subtipo === "multiple_choice" && questao.alternativas ? (
        <div className="space-y-2">
          {questao.alternativas.map((alt) => (
            <button key={alt} onClick={() => onChange(alt)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                resposta === alt
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-background text-foreground border-border hover:border-primary-300"
              }`}>
              {alt}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          value={resposta}
          onChange={(e) => onChange(e.target.value)}
          rows={questao.subtipo === "redacao" ? 8 : 3}
          placeholder={questao.subtipo === "redacao" ? "Escreva sua redação aqui..." : "Digite sua resposta..."}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      )}
    </div>
  );
}
