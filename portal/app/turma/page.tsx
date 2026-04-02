"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ChevronRight, FileText, Link, Video, Image, Download, ClipboardList, CircleCheck, CircleX, Clock } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { RaviCard } from "@/components/portal/RaviCard";
import { portalService, type AulaPortal, type MaterialPortal, type AvaliacaoPortal } from "@/services/portal";

type Tab = "aulas" | "avaliacoes" | "biblioteca";

const STATUS_LABEL: Record<string, string> = {
  agendada:  "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  agendada:  "bg-primary-100 text-primary-700",
  realizada: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-rose-100 text-rose-600",
};

const CATEGORIA_LABEL: Record<string, string> = {
  exercicio:   "Exercício",
  gramatica:   "Gramática",
  vocabulario: "Vocabulário",
  pronuncia:   "Pronúncia",
  outro:       "Outro",
};

const FORMATO_MES_CURTO = new Intl.DateTimeFormat("pt-BR", { month: "short" });

function parseDateLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function formatData(iso: string) {
  return parseDateLocal(iso)
    .toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

// ── Ícone por tipo de material ────────────────────────────────────────────────

function TipoIcon({ tipo }: { tipo: string }) {
  const cls = "shrink-0 text-muted";
  if (tipo === "link")   return <Link   size={14} strokeWidth={1.75} className={cls} />;
  if (tipo === "video")  return <Video  size={14} strokeWidth={1.75} className={cls} />;
  if (tipo === "imagem") return <Image  size={14} strokeWidth={1.75} className={cls} />;
  return <FileText size={14} strokeWidth={1.75} className={cls} />;
}

// ── Item de material ──────────────────────────────────────────────────────────

function MaterialItem({ m }: { m: MaterialPortal }) {
  const [downloading, setDownloading] = useState(false);

  async function handleAcesso() {
    if (m.tipo === "link") return;
    setDownloading(true);
    try {
      const { url } = await portalService.downloadMaterial(m.id);
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-start gap-3 py-2.5 border-t border-border first:border-t-0">
      <TipoIcon tipo={m.tipo} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{m.titulo}</p>
        <p className="text-xs text-muted mt-0.5">{CATEGORIA_LABEL[m.categoria] ?? m.categoria}</p>
        {m.descricao && <p className="text-xs text-muted mt-0.5 line-clamp-2">{m.descricao}</p>}
      </div>
      {m.tipo === "link" ? (
        <a
          href={undefined}
          onClick={async (e) => {
            e.preventDefault();
            const { url } = await portalService.downloadMaterial(m.id).catch(() => ({ url: "" }));
            if (url) window.open(url, "_blank");
          }}
          className="shrink-0 text-xs font-semibold text-primary-600"
        >
          Abrir
        </a>
      ) : m.tem_arquivo ? (
        <button
          onClick={handleAcesso}
          disabled={downloading}
          className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary-600 disabled:opacity-50"
        >
          <Download size={13} strokeWidth={2} />
          {downloading ? "..." : "Baixar"}
        </button>
      ) : (
        <span className="shrink-0 text-xs text-muted">Em breve</span>
      )}
    </div>
  );
}

// ── Card de aula com presença embutida ────────────────────────────────────────

interface AulaItemProps {
  aula: AulaPortal;
  presente: boolean | null; // null = aula ainda não realizada
}

function AulaItem({ aula, presente }: AulaItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [materiais, setMateriais] = useState<MaterialPortal[] | null>(null);
  const [loadingMat, setLoadingMat] = useState(false);

  async function handleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (materiais === null) {
      setLoadingMat(true);
      portalService.materiaisAula(aula.id)
        .then(setMateriais)
        .catch(() => setMateriais([]))
        .finally(() => setLoadingMat(false));
    }
  }

  const statusClass = STATUS_COLOR[aula.status] ?? "bg-border text-muted";

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <button onClick={handleExpand} className="w-full flex items-start gap-4 p-4 text-left">

        {/* Calendário */}
        <div className="w-11 h-11 rounded-xl bg-primary-600 flex flex-col items-center justify-center text-white shrink-0">
          <span className="text-sm font-black leading-none">{aula.data.split("-")[2]}</span>
          <span className="text-xs leading-none opacity-80">
            {FORMATO_MES_CURTO.format(parseDateLocal(aula.data))}
          </span>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{formatData(aula.data)}</p>
          <p className="text-xs text-muted mt-0.5">{aula.hora_inicio.slice(0, 5)} – {aula.hora_fim.slice(0, 5)}</p>
          {aula.turma_nome && (
            <p className="text-xs text-primary-600 font-medium mt-1 truncate">{aula.turma_nome}</p>
          )}
          <p className="text-xs text-muted mt-0.5 truncate">Prof. {aula.professor_nome}</p>

          {/* Badges: status + presença */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${statusClass}`}>
              {STATUS_LABEL[aula.status] ?? aula.status}
            </span>
            {presente === true && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                <CircleCheck size={12} strokeWidth={2} /> Presente
              </span>
            )}
            {presente === false && (
              <span className="flex items-center gap-1 text-xs font-semibold text-rose-500 bg-rose-50 rounded-full px-2 py-0.5">
                <CircleX size={12} strokeWidth={2} /> Ausente
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div className="shrink-0 text-muted self-center">
          {expanded ? <ChevronUp size={16} strokeWidth={1.75} /> : <ChevronDown size={16} strokeWidth={1.75} />}
        </div>
      </button>

      {/* Materiais expandidos */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          <p className="text-xs font-bold text-muted uppercase tracking-widest pt-3 pb-2">Material da aula</p>
          {loadingMat && (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-8 bg-border rounded animate-pulse" />)}
            </div>
          )}
          {!loadingMat && materiais?.length === 0 && (
            <p className="text-xs text-muted">Nenhum material para esta aula.</p>
          )}
          {!loadingMat && materiais && materiais.length > 0 && (
            <div>{materiais.map((m) => <MaterialItem key={m.id} m={m} />)}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab de Biblioteca ─────────────────────────────────────────────────────────

const CATEGORIAS = [
  { value: "",            label: "Todos" },
  { value: "exercicio",   label: "Exercícios" },
  { value: "gramatica",   label: "Gramática" },
  { value: "vocabulario", label: "Vocabulário" },
  { value: "pronuncia",   label: "Pronúncia" },
  { value: "outro",       label: "Outros" },
];

function BibliotecaTab() {
  const [categoria, setCategoria] = useState("");
  const [materiais, setMateriais] = useState<MaterialPortal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    portalService.biblioteca(categoria ? { categoria } : undefined)
      .then(setMateriais)
      .catch(() => setMateriais([]))
      .finally(() => setLoading(false));
  }, [categoria]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIAS.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategoria(c.value)}
            className={`shrink-0 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors ${
              categoria === c.value ? "bg-primary-600 text-white" : "bg-border text-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <SkeletonList />}

      {!loading && materiais.length === 0 && (
        <RaviCard
          message="Nenhum material ainda!"
          sub="Os materiais disponibilizados para você aparecerão aqui."
        />
      )}

      {!loading && materiais.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {materiais.map((m) => (
            <div key={m.id} className="px-4">
              <MaterialItem m={m} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TOPICO_LABELS: Record<string, string> = {
  grammar: "Gramática", vocabulary: "Vocabulário", reading: "Leitura",
  listening: "Audição", writing: "Escrita", speaking: "Fala", pronunciation: "Pronúncia",
};

function AvaliacoesTab() {
  const router = useRouter();
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoPortal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalService.avaliacoes()
      .then(setAvaliacoes)
      .catch(() => setAvaliacoes([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonList />;

  if (avaliacoes.length === 0) {
    return (
      <RaviCard
        message="Nenhuma avaliação ainda!"
        sub="As avaliações da sua turma aparecerão aqui quando forem publicadas."
      />
    );
  }

  // Agrupar por módulo
  const grupos = new Map<string, AvaliacaoPortal[]>();
  for (const av of avaliacoes) {
    const key = av.modulo ?? "__sem_modulo__";
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(av);
  }

  return (
    <div className="space-y-6">
      {[...grupos.entries()].map(([modulo, items]) => (
        <div key={modulo} className="space-y-3">
          {modulo !== "__sem_modulo__" && (
            <p className="text-xs font-bold text-muted uppercase tracking-widest">{modulo}</p>
          )}
          {items.map((av) => {
            const jaRespondida = av.status_aluno !== null;
            const concluida = av.status_aluno === "concluida";
            const aguardando = av.status_aluno === "aguardando_correcao";
            const bloqueada = !av.disponivel && !jaRespondida;

            const horario = av.hora_inicio && av.hora_fim
              ? `${av.hora_inicio.slice(0, 5)}–${av.hora_fim.slice(0, 5)}`
              : av.hora_inicio
              ? `a partir das ${av.hora_inicio.slice(0, 5)}`
              : null;

            const dataFormatada = av.data_aplicacao
              ? new Date(av.data_aplicacao + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
              : null;

            return (
              <button
                key={av.id}
                onClick={() => {
                  if (concluida) router.push(`/turma/avaliacao/${av.id}/resultado`);
                  else if (!jaRespondida && !bloqueada) router.push(`/turma/avaliacao/${av.id}`);
                }}
                disabled={aguardando || bloqueada}
                className="w-full text-left bg-surface border border-border rounded-2xl p-4 flex items-center gap-4 disabled:opacity-60"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  concluida ? "bg-emerald-100" : aguardando ? "bg-amber-100" : bloqueada ? "bg-border" : "bg-primary-600"
                }`}>
                  {concluida
                    ? <CircleCheck size={22} className="text-emerald-600" />
                    : aguardando
                    ? <Clock size={22} className="text-amber-600" />
                    : <ClipboardList size={22} className={bloqueada ? "text-muted" : "text-white"} strokeWidth={1.75} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{av.titulo}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {TOPICO_LABELS[av.topico] ?? av.topico} · {av.total_questoes} {av.total_questoes !== 1 ? "questões" : "questão"}
                  </p>
                  {(dataFormatada || horario) && !jaRespondida && (
                    <p className="text-xs text-muted mt-1">
                      {dataFormatada && horario
                        ? `${dataFormatada} · ${horario}`
                        : dataFormatada ?? horario}
                    </p>
                  )}
                  {concluida && av.nota_final != null && (
                    <p className="text-xs font-semibold text-emerald-600 mt-1">Nota: {av.nota_final.toFixed(1)}</p>
                  )}
                  {aguardando && (
                    <p className="text-xs font-semibold text-amber-600 mt-1">Aguardando correção do professor</p>
                  )}
                </div>
                {!aguardando && !bloqueada && <ChevronRight size={16} className="text-muted shrink-0" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { value: Tab; label: string }[] = [
  { value: "aulas",      label: "Aulas" },
  { value: "avaliacoes", label: "Avaliações" },
  { value: "biblioteca", label: "Biblioteca" },
];

export default function TurmaPage() {
  const [tab, setTab] = useState<Tab>("aulas");
  const [aulas, setAulas] = useState<AulaPortal[]>([]);
  // Map de aula_id → presente (apenas aulas realizadas terão entrada)
  const [presencaMap, setPresencaMap] = useState<Map<number, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab !== "aulas") return;
    setLoading(true);
    Promise.allSettled([
      portalService.aulas({ page_size: 50 }),
      portalService.presencas({ page_size: 200 }),
    ])
      .then(([aulasResult, presencasResult]) => {
        const items = aulasResult.status === "fulfilled" ? aulasResult.value.items : [];
        const presencas = presencasResult.status === "fulfilled" ? presencasResult.value : [];
        setAulas(items);
        setPresencaMap(new Map(presencas.map((p) => [p.aula_id, p.presente])));
      })
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <AppShell>
      <div className="px-5 py-6 space-y-4">
        <h1 className="text-xl font-black text-foreground">Turma</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-border rounded-2xl p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                tab === t.value ? "bg-surface text-foreground shadow-sm" : "text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "biblioteca" ? (
          <BibliotecaTab />
        ) : tab === "avaliacoes" ? (
          <AvaliacoesTab />
        ) : loading ? (
          <SkeletonList />
        ) : aulas.length === 0 ? (
          <RaviCard message="Nenhuma aula ainda!" sub="Suas aulas aparecerão aqui quando forem agendadas." />
        ) : (
          <div className="space-y-3">
            {aulas.map((a) => (
              <AulaItem
                key={a.id}
                aula={a}
                presente={a.status === "realizada" ? (presencaMap.get(a.id) ?? false) : null}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface border border-border rounded-2xl p-4 animate-pulse flex gap-4">
          <div className="w-11 h-11 rounded-xl bg-border shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-border rounded w-1/2" />
            <div className="h-3 bg-border rounded w-1/3" />
            <div className="h-3 bg-border rounded w-1/4 mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
