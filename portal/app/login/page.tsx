"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";
import { Logo } from "@/components/ui/Logo";
import { PwaInstallGuide } from "@/components/ui/PwaInstallGuide";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authService.login(username.trim(), senha);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <Logo variant="light" width={80} />
          <div className="text-center">
            <p className="font-black text-primary-600 text-2xl tracking-wide leading-none">Ravila&apos;s</p>
            <div className="h-px bg-primary-100 my-1 mx-6" />
            <p className="font-bold text-primary-400 text-xs uppercase tracking-widest leading-none">English</p>
          </div>
          <p className="text-sm text-muted mt-1">Portal do Aluno</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              autoFocus
              autoComplete="username"
              placeholder="Seu usuário"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <PwaInstallGuide />
      </div>
    </div>
  );
}
