"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Lock, Eye, EyeOff } from "lucide-react";
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

  // Dados pessoais
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [successDados, setSuccessDados] = useState(false);
  const [erroDados, setErroDados] = useState("");

  // Senha
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [successSenha, setSuccessSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState("");

  useEffect(() => {
    authService.me()
      .then((me) => {
        setData(me);
        setNome(me.nome ?? "");
        setEmail(me.email ?? "");
        setTelefone(me.telefone ?? "");
      })
      .catch(() => router.replace("/perfil"))
      .finally(() => setLoading(false));
  }, []);

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
      if (result.nome && typeof window !== "undefined") {
        setData((d) => d ? { ...d, nome: result.nome, email: result.email, telefone: result.telefone } : d);
      }
      setSuccessDados(true);
      setTimeout(() => setSuccessDados(false), 3000);
    } catch (err) {
      setErroDados(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErroSenha("");
    setSuccessSenha(false);
    if (novaSenha.length < 6) { setErroSenha("A senha deve ter pelo menos 6 caracteres."); return; }
    if (novaSenha !== confirmarSenha) { setErroSenha("As senhas não coincidem."); return; }
    setSalvandoSenha(true);
    try {
      await authService.atualizarPerfil({ senha: novaSenha });
      setNovaSenha("");
      setConfirmarSenha("");
      setSuccessSenha(true);
      setTimeout(() => setSuccessSenha(false), 3000);
    } catch (err) {
      setErroSenha(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setSalvandoSenha(false);
    }
  }

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

        {/* Senha */}
        <form onSubmit={handleSalvarSenha} className="space-y-4">
          <h2 className="text-xs font-bold text-muted uppercase tracking-widest">Alterar senha</h2>

          <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
            <Field label="Nova senha">
              <div className="flex items-center px-4">
                <input
                  type={showSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="flex-1 text-sm text-foreground bg-transparent focus:outline-none py-3"
                  placeholder="Mínimo 6 caracteres"
                />
                <button type="button" onClick={() => setShowSenha((v) => !v)} className="text-muted ml-2">
                  {showSenha ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                </button>
              </div>
            </Field>
            <Field label="Confirmar senha">
              <input
                type={showSenha ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full text-sm text-foreground bg-transparent focus:outline-none py-3 px-4"
                placeholder="Repita a senha"
              />
            </Field>
          </div>

          {erroSenha && <p className="text-xs text-rose-600">{erroSenha}</p>}
          {successSenha && <p className="text-xs text-emerald-600">Senha alterada com sucesso!</p>}

          <button
            type="submit"
            disabled={salvandoSenha || !novaSenha}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 py-3.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-60"
          >
            <Lock size={16} strokeWidth={2} />
            {salvandoSenha ? "Alterando..." : "Alterar senha"}
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
