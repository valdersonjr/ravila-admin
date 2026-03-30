"use client";
import { useEffect, useState } from "react";
import { CircleCheck, CircleX, ChevronDown, ChevronUp, FileText, Link, Video, Image, Download, BookOpen } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { RaviCard } from "@/components/portal/RaviCard";
import { portalService, type AulaPortal, type PresencaPortal, type MaterialPortal } from "@/services/portal";

type Tab = "aulas" | "presencas" | "biblioteca";

const STATUS_LABEL: Record<string, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  agendada: "bg-primary-100 text-primary-700",
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

function TipoIcon({ tipo }: { tipo: string }) {
  const cls = "shrink-0 text-muted";
  if (tipo === "link")   return <Link   size={14} strokeWidth={1.75} className={cls} />;
  if (tipo === "video")  return <Video  size={14} strokeWidth={1.75} className={cls} />;
  if (tipo === "imagem") return <Image  size={14} strokeWidth={1.75} className={cls} />;
  return <FileText size={14} strokeWidth={1.75} className={cls} />;
}

// ── Material item (reused in both Aula expand and Biblioteca) ─────────────────

function MaterialItem({ m }: { m: MaterialPortal }) {
  const [downloading, setDownloading] = useState(false);

  async function handleAcesso() {
    if (m.tipo === "link") return; // link is handled by <a>
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

// ── Aula item com expansão de materiais ───────────────────────────────────────

function AulaItem({ aula }: { aula: AulaPortal }) {
  const [expanded, setExpanded] = useState(false);
  const [materiais, setMateriais] = useState<MaterialPortal[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (materiais === null) {
      setLoading(true);
      portalService.materiaisAula(aula.id)
        .then(setMateriais)
        .catch(() => setMateriais([]))
        .finally(() => setLoading(false));
    }
  }

  const statusClass = STATUS_COLOR[aula.status] ?? "bg-border text-muted";

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full flex items-start gap-4 p-4 text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-primary-600 flex flex-col items-center justify-center text-white shrink-0">
          <span className="text-sm font-black leading-none">{aula.data.split("-")[2]}</span>
          <span className="text-xs leading-none opacity-80">
            {FORMATO_MES_CURTO.format(parseDateLocal(aula.data))}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{formatData(aula.data)}</p>
            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 shrink-0 ${statusClass}`}>
              {STATUS_LABEL[aula.status] ?? aula.status}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">{aula.hora_inicio.slice(0,5)} – {aula.hora_fim.slice(0,5)}</p>
          {aula.turma_nome && <p className="text-xs text-primary-600 font-medium mt-1 truncate">{aula.turma_nome}</p>}
          <p className="text-xs text-muted mt-0.5 truncate">Prof. {aula.professor_nome}</p>
        </div>
        <div className="shrink-0 text-muted self-center">
          {expanded
            ? <ChevronUp size={16} strokeWidth={1.75} />
            : <ChevronDown size={16} strokeWidth={1.75} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          <p className="text-xs font-bold text-muted uppercase tracking-widest pt-3 pb-2">Material da aula</p>
          {loading && (
            <div className="space-y-2">
              {[1,2].map((i) => <div key={i} className="h-8 bg-border rounded animate-pulse" />)}
            </div>
          )}
          {!loading && materiais?.length === 0 && (
            <p className="text-xs text-muted">Nenhum material para esta aula.</p>
          )}
          {!loading && materiais && materiais.length > 0 && (
            <div>
              {materiais.map((m) => <MaterialItem key={m.id} m={m} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Presença item ─────────────────────────────────────────────────────────────

function PresencaItem({ presenca }: { presenca: PresencaPortal }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
        presenca.presente ? "bg-emerald-100" : "bg-rose-100"
      }`}>
        {presenca.presente
          ? <CircleCheck size={22} strokeWidth={1.75} className="text-emerald-600" />
          : <CircleX    size={22} strokeWidth={1.75} className="text-rose-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{formatData(presenca.data)}</p>
        <p className="text-xs text-muted mt-0.5">{presenca.hora_inicio.slice(0,5)} – {presenca.hora_fim.slice(0,5)}</p>
        {presenca.turma_nome && <p className="text-xs text-primary-600 font-medium mt-1 truncate">{presenca.turma_nome}</p>}
        <p className={`text-xs font-semibold mt-1 ${presenca.presente ? "text-emerald-600" : "text-rose-500"}`}>
          {presenca.presente ? "Presente" : "Ausente"}
        </p>
      </div>
    </div>
  );
}

// ── Biblioteca ────────────────────────────────────────────────────────────────

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
      {/* Filtro de categoria */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIAS.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategoria(c.value)}
            className={`shrink-0 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors ${
              categoria === c.value
                ? "bg-primary-600 text-white"
                : "bg-border text-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <SkeletonList />}

      {!loading && materiais.length === 0 && (
        <RaviCard
          message="No materials yet!"
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AtividadePage() {
  const [tab, setTab] = useState<Tab>("aulas");
  const [aulas, setAulas] = useState<AulaPortal[]>([]);
  const [presencas, setPresencas] = useState<PresencaPortal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab === "biblioteca") return;
    setLoading(true);
    if (tab === "aulas") {
      portalService.aulas({ page_size: 50 })
        .then((r) => setAulas(r.items))
        .catch(() => setAulas([]))
        .finally(() => setLoading(false));
    } else {
      portalService.presencas({ page_size: 50 })
        .then(setPresencas)
        .catch(() => setPresencas([]))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <AppShell>
      <div className="px-5 py-6 space-y-4">
        <h1 className="text-xl font-black text-foreground">Atividade</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-border rounded-2xl p-1">
          <TabButton active={tab === "aulas"}     onClick={() => setTab("aulas")}>Aulas</TabButton>
          <TabButton active={tab === "presencas"} onClick={() => setTab("presencas")}>Presenças</TabButton>
          <TabButton active={tab === "biblioteca"} onClick={() => setTab("biblioteca")}>
            <span className="flex items-center gap-1 justify-center">
              <BookOpen size={13} strokeWidth={2} />
              Biblioteca
            </span>
          </TabButton>
        </div>

        {tab === "biblioteca" ? (
          <BibliotecaTab />
        ) : loading ? (
          <SkeletonList />
        ) : tab === "aulas" ? (
          aulas.length === 0 ? (
            <RaviCard message="No classes yet!" sub="Suas aulas aparecerão aqui quando forem agendadas." />
          ) : (
            <div className="space-y-3">
              {aulas.map((a) => <AulaItem key={a.id} aula={a} />)}
            </div>
          )
        ) : (
          presencas.length === 0 ? (
            <RaviCard message="No attendance records yet!" sub="Seu histórico de presenças aparecerá aqui." />
          ) : (
            <div className="space-y-3">
              {presencas.map((p) => <PresencaItem key={p.id} presenca={p} />)}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
        active ? "bg-surface text-foreground shadow-sm" : "text-muted"
      }`}
    >
      {children}
    </button>
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
          </div>
        </div>
      ))}
    </div>
  );
}
