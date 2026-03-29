"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Flame, TrendingUp, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import {
  portalService,
  type QuestaoPortal,
  type QuestaoAlunoDia,
  type QuestaoRespostaPortal,
  type NivelProgresso,
} from "@/services/portal";

const NIVEIS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const ESTILOS = [
  { value: "casual", label: "Casual" },
  { value: "vestibular", label: "Vestibular" },
  { value: "toefl_ielts", label: "TOEFL / IELTS" },
];

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = "diaria" | "banco";

export default function PraticaPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("diaria");
  const [progresso, setProgresso] = useState<NivelProgresso | null>(null);

  useEffect(() => {
    portalService.nivelProgresso().then(setProgresso).catch(() => {});
  }, []);

  return (
    <AppShell>
      <div className="px-5 pt-5 pb-2">
        <h1 className="text-xl font-black text-foreground">Prática</h1>
      </div>

      {/* Banner informativo de desempenho */}
      {progresso?.nivel_atual && progresso.total_respondidas >= 5 && (
        <div className="px-5 pb-3">
          <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3">
            <TrendingUp size={18} className="text-primary-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted">Desempenho em {progresso.nivel_atual}</p>
              <p className="text-sm font-bold text-foreground">{progresso.percentual}% de acerto nas últimas questões</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 bg-surface border border-border rounded-xl p-1">
          {(["diaria", "banco"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === t
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t === "diaria" ? "Questão do dia" : "Banco livre"}
            </button>
          ))}
        </div>
      </div>

      {tab === "diaria" ? <QuesataoDiariaTab /> : <BancoLivreTab temNivel={!!progresso?.nivel_atual} nivelAluno={progresso?.nivel_atual ?? null} />}
    </AppShell>
  );
}

// ── Questão do dia ────────────────────────────────────────────────────────────

function QuesataoDiariaTab() {
  const router = useRouter();
  const [estado, setEstado] = useState<"loading" | "sem_nivel" | "questao" | "resultado">("loading");
  const [diaria, setDiaria] = useState<QuestaoAlunoDia | null>(null);
  const [resultado, setResultado] = useState<QuestaoRespostaPortal | null>(null);
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function carregarDiaria() {
    setEstado("loading");
    try {
      const d = await portalService.questaoDiaria();
      setDiaria(d);
      setEstado(d.respondida ? "resultado" : "questao");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "nivel_nao_configurado") {
        setEstado("sem_nivel");
      } else {
        setEstado("sem_nivel");
      }
    }
  }

  useEffect(() => { carregarDiaria(); }, []);

  async function handleResponder() {
    if (!resposta) return;
    setEnviando(true);
    try {
      const res = await portalService.responderDiaria(resposta);
      setResultado(res);
      setEstado("resultado");
    } finally {
      setEnviando(false);
    }
  }

  if (estado === "loading") return <LoadingCard />;

  if (estado === "sem_nivel") {
    return (
      <div className="px-5 space-y-4">
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 text-center">
          <ClipboardList size={32} className="text-primary-600 mx-auto" />
          <div>
            <p className="text-sm font-bold text-foreground">Faça o teste de proficiência</p>
            <p className="text-xs text-muted mt-1">Precisamos saber seu nível para enviar a questão certa para você.</p>
          </div>
          <button
            onClick={() => router.push("/pratica/proficiencia")}
            className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold"
          >
            Fazer o teste agora
          </button>
        </div>
      </div>
    );
  }

  if (estado === "resultado" && diaria) {
    // Já foi respondida hoje — mostra o resultado se tiver, senão mensagem
    const acertou = resultado?.acertou;
    const streak = resultado?.streak ?? 0;
    const respostaCorreta = resultado?.resposta_correta ?? null;
    const jaRespondida = diaria.respondida && !resultado;

    return (
      <div className="px-5 space-y-4">
        {jaRespondida ? (
          <div className="bg-surface border border-border rounded-2xl p-5 text-center space-y-2">
            <CheckCircle size={32} className="text-green-500 mx-auto" />
            <p className="text-sm font-bold text-foreground">Você já respondeu a questão de hoje!</p>
            <p className="text-xs text-muted">Volte amanhã para uma nova questão.</p>
          </div>
        ) : (
          <div className={`rounded-2xl p-5 border space-y-3 ${acertou ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-2">
              {acertou
                ? <CheckCircle size={22} className="text-green-600 shrink-0" />
                : <XCircle size={22} className="text-red-500 shrink-0" />}
              <p className={`text-base font-black ${acertou ? "text-green-700" : "text-red-600"}`}>
                {acertou ? "Acertou!" : "Errou!"}
              </p>
            </div>
            <p className="text-xs text-muted">Resposta correta:</p>
            <p className="text-sm font-bold text-foreground">{respostaCorreta}</p>
            {resultado?.explicacao && (
              <div className="border-t border-current/20 pt-3">
                <p className="text-xs font-semibold text-muted mb-1">Explicação</p>
                <p className="text-sm text-foreground leading-relaxed">{resultado.explicacao}</p>
              </div>
            )}
          </div>
        )}

        {streak > 0 && (
          <div className="bg-surface border border-primary-100 rounded-2xl p-4 flex items-center gap-3">
            <Flame size={28} className="text-primary-500 shrink-0" />
            <div>
              <p className="text-foreground">
                <span className="text-xl font-black text-primary-600">{streak}</span>
                <span className="text-sm font-bold text-primary-600"> dias</span>
              </p>
              <p className="text-xs text-muted">de sequência nas questões</p>
            </div>
          </div>
        )}

        <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-muted uppercase tracking-widest">Questão de hoje</p>
          <p className="text-sm text-foreground">{diaria.questao.enunciado}</p>
        </div>
      </div>
    );
  }

  if (estado === "questao" && diaria) {
    return (
      <div className="px-5 space-y-4">
        <QuestaoCard
          questao={diaria.questao}
          resposta={resposta}
          setResposta={setResposta}
          onSubmit={handleResponder}
          loading={enviando}
        />
      </div>
    );
  }

  return null;
}

// ── Banco livre ───────────────────────────────────────────────────────────────

function BancoLivreTab({ temNivel, nivelAluno }: { temNivel: boolean; nivelAluno: string | null }) {
  const router = useRouter();

  if (!temNivel) {
    return (
      <div className="px-5">
        <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
          <ClipboardList size={32} className="text-primary-600 mx-auto" />
          <div>
            <p className="text-sm font-bold text-foreground">Faça o teste de proficiência primeiro</p>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              O banco de questões é liberado após o teste para garantir que você pratique no nível certo.
            </p>
          </div>
          <button
            onClick={() => router.push("/pratica/proficiencia")}
            className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold"
          >
            Fazer o teste agora
          </button>
        </div>
      </div>
    );
  }
  const [nivel, setNivel] = useState("");
  const [estilo, setEstilo] = useState("");
  const [fila, setFila] = useState<QuestaoPortal[]>([]);
  const [indice, setIndice] = useState(0);
  const [resultado, setResultado] = useState<QuestaoRespostaPortal | null>(null);
  const [resposta, setResposta] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function carregarFila(n: string, e: string) {
    setLoading(true);
    setResultado(null);
    setResposta("");
    try {
      const items = await portalService.bancoquestoes({ nivel: n, estilo: e || undefined });
      // embaralhar para variedade
      const embaralhado = [...items].sort(() => Math.random() - 0.5);
      setFila(embaralhado);
      setIndice(0);
    } finally {
      setLoading(false);
    }
  }

  function handleNivel(n: string) {
    setNivel(n);
    if (n) carregarFila(n, estilo);
  }

  function handleEstilo(e: string) {
    setEstilo(e);
    if (nivel) carregarFila(nivel, e);
  }

  async function handleResponder() {
    if (!resposta || !fila[indice]) return;
    setEnviando(true);
    try {
      const res = await portalService.responderBanco(fila[indice].id, resposta);
      setResultado(res);
    } finally {
      setEnviando(false);
    }
  }

  async function proxima() {
    const proximoIndice = indice + 1;
    if (proximoIndice < fila.length) {
      setIndice(proximoIndice);
      setResultado(null);
      setResposta("");
    } else {
      // Recarrega mais questões
      await carregarFila(nivel, estilo);
    }
  }

  const questaoAtual = fila[indice] ?? null;

  return (
    <div className="px-5 space-y-4">
      {/* Filtros */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Nível</p>
          <div className="flex gap-2 flex-wrap">
            {NIVEIS.map((n) => (
              <PillFilter key={n} active={nivel === n} onClick={() => handleNivel(n)}>
                {n}
              </PillFilter>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Estilo</p>
          <div className="flex gap-2 flex-wrap">
            <PillFilter active={estilo === ""} onClick={() => handleEstilo("")}>Todos</PillFilter>
            {ESTILOS.map((e) => (
              <PillFilter key={e.value} active={estilo === e.value} onClick={() => handleEstilo(e.value)}>
                {e.label}
              </PillFilter>
            ))}
          </div>
        </div>
      </div>

      {/* Aviso fora do nível */}
      {nivel && nivelAluno && nivel !== nivelAluno && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-amber-500 text-base leading-none mt-0.5">⚠</span>
          <p className="text-xs text-amber-800 leading-relaxed">
            Você está praticando no nível <strong>{nivel}</strong>, mas seu nível é <strong>{nivelAluno}</strong>. Apenas questões do seu nível contam para o seu progresso.
          </p>
        </div>
      )}

      {/* Conteúdo */}
      {!nivel ? (
        <div className="bg-surface border border-border rounded-2xl p-5 text-center">
          <p className="text-sm text-muted">Selecione um nível para começar a praticar.</p>
        </div>
      ) : loading ? (
        <LoadingCard />
      ) : !questaoAtual ? (
        <div className="bg-surface border border-border rounded-2xl p-5 text-center">
          <p className="text-sm text-muted">Nenhuma questão encontrada para esses filtros.</p>
        </div>
      ) : resultado ? (
        <div className="space-y-3">
          <div className={`rounded-2xl p-5 border space-y-3 ${resultado.acertou ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className={`flex items-center gap-2 font-bold text-sm ${resultado.acertou ? "text-green-700" : "text-red-600"}`}>
              {resultado.acertou
                ? <CheckCircle size={16} className="text-green-600" />
                : <XCircle size={16} className="text-red-500" />}
              {resultado.acertou ? "Correto!" : "Errou"}
            </div>
            <p className="text-xs text-muted">Resposta correta: <span className="font-semibold text-foreground">{resultado.resposta_correta}</span></p>
            {resultado.explicacao && (
              <p className="text-xs text-foreground leading-relaxed border-t border-current/10 pt-2">{resultado.explicacao}</p>
            )}
          </div>
          <button onClick={proxima} className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold">
            Próxima questão
          </button>
        </div>
      ) : (
        <QuestaoCard
          questao={questaoAtual}
          resposta={resposta}
          setResposta={setResposta}
          onSubmit={handleResponder}
          loading={enviando}
        />
      )}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;

function QuestaoCard({
  questao,
  resposta,
  setResposta,
  onSubmit,
  loading,
  compact = false,
}: {
  questao: QuestaoPortal;
  resposta: string;
  setResposta: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "bg-surface border border-border rounded-2xl p-5 space-y-4"}>
      {!compact && (
        <div className="flex flex-wrap gap-1">
          <LevelBadge>{questao.nivel}</LevelBadge>
        </div>
      )}

      {/* Texto de apoio */}
      {questao.texto_apoio && (
        <div className="bg-background border-l-4 border-primary-300 rounded-r-lg px-3 py-2 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
          {questao.texto_apoio}
        </div>
      )}

      {/* Mídia */}
      {questao.midia_url && (
        IMAGE_EXTS.test(questao.midia_url) ? (
          <img
            src={questao.midia_url}
            alt="Mídia da questão"
            className="rounded-xl border border-border max-h-52 w-full object-contain bg-background"
          />
        ) : (
          <a
            href={questao.midia_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-primary-600 underline"
          >
            Ver mídia da questão
          </a>
        )
      )}

      <p className="text-sm font-semibold text-foreground leading-relaxed">{questao.enunciado}</p>

      {questao.subtipo === "multiple_choice" && questao.alternativas ? (
        <div className="space-y-2">
          {questao.alternativas.map((alt) => (
            <button
              key={alt}
              onClick={() => setResposta(alt)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                resposta === alt
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-background text-foreground border-border hover:border-primary-300"
              }`}
            >
              {alt}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Digite sua resposta..."
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      )}

      <button
        onClick={onSubmit}
        disabled={!resposta || loading}
        className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold disabled:opacity-40 transition-opacity"
      >
        {loading ? "Enviando..." : "Confirmar resposta"}
      </button>
    </div>
  );
}

function LevelBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-md bg-primary-100 text-primary-700 text-[11px] font-bold">
      {children}
    </span>
  );
}


function PillFilter({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
        active ? "bg-primary-600 text-white border-primary-600" : "bg-surface text-muted border-border"
      }`}
    >
      {children}
    </button>
  );
}

function LoadingCard() {
  return (
    <div className="px-5">
      <div className="bg-surface border border-border rounded-2xl p-5 animate-pulse space-y-3">
        <div className="h-3 bg-border rounded w-1/4" />
        <div className="h-4 bg-border rounded w-full" />
        <div className="h-4 bg-border rounded w-3/4" />
        <div className="h-10 bg-border rounded-xl w-full mt-2" />
      </div>
    </div>
  );
}
