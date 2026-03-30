"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Camera } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { authService } from "@/services/auth";

interface MeData {
  nome: string;
  email: string | null;
  telefone: string | null;
  tem_foto: boolean;
}

export default function MeusDadosPage() {
  const router = useRouter();

  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploadandoFoto, setUploadandoFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [successDados, setSuccessDados] = useState(false);
  const [erroDados, setErroDados] = useState("");

  useEffect(() => {
    authService.me()
      .then((me) => {
        setData(me);
        setNome(me.nome ?? "");
        setEmail(me.email ?? "");
        setTelefone(me.telefone ?? "");
        if (me.tem_foto) {
          authService.getFotoUrl().then((r) => setFotoUrl(r.url)).catch(() => {});
        }
      })
      .catch(() => router.replace("/perfil"))
      .finally(() => setLoading(false));
  }, []);

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadandoFoto(true);
    try {
      await authService.uploadFoto(file);
      const r = await authService.getFotoUrl();
      setFotoUrl(r.url);
      setData((d) => d ? { ...d, tem_foto: true } : d);
      window.dispatchEvent(new CustomEvent("foto-atualizada", { detail: { url: r.url } }));
    } catch (err) {
      console.error("Erro no upload de foto:", err);
    } finally {
      setUploadandoFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSalvarDados(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErroDados("");
    setSuccessDados(false);
    try {
      const result = await authService.atualizarPerfil({
        nome: nome.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
      });
      setData((d) => d ? { ...d, nome: result.nome, email: result.email, telefone: result.telefone } : d);
      setSuccessDados(true);
      setTimeout(() => setSuccessDados(false), 3000);
    } catch (err) {
      setErroDados(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const initials = (data?.nome ?? "A").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-40">
          <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-5 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted hover:text-foreground transition-colors">
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
          <h1 className="text-xl font-black text-foreground">Meus dados</h1>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadandoFoto}
            className="relative group"
          >
            <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-black overflow-hidden">
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadandoFoto
                ? <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <Camera size={18} className="text-white" strokeWidth={1.75} />
              }
            </div>
          </button>
          <p className="text-xs text-muted">Toque para alterar a foto</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFotoChange}
          />
        </div>

        {/* Dados pessoais */}
        <form onSubmit={handleSalvarDados} className="space-y-4">
          <h2 className="text-xs font-bold text-muted uppercase tracking-widest">Informações pessoais</h2>

          <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
            <Field label="Nome completo">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full text-sm text-foreground bg-transparent focus:outline-none py-3 px-4"
                placeholder="Seu nome"
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm text-foreground bg-transparent focus:outline-none py-3 px-4"
                placeholder="seu@email.com"
              />
            </Field>
            <Field label="Telefone">
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full text-sm text-foreground bg-transparent focus:outline-none py-3 px-4"
                placeholder="(00) 00000-0000"
              />
            </Field>
          </div>

          {erroDados && <p className="text-xs text-rose-600">{erroDados}</p>}
          {successDados && <p className="text-xs text-emerald-600">Dados atualizados com sucesso!</p>}

          <button
            type="submit"
            disabled={salvando}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            <Save size={16} strokeWidth={2} />
            {salvando ? "Salvando..." : "Salvar dados"}
          </button>
        </form>

      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted px-4 pt-3 leading-none">{label}</p>
      {children}
    </div>
  );
}
