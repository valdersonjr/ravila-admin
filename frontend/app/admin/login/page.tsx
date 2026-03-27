"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { authService } from "@/services/auth";

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
      const data = await authService.login(username.trim(), senha);
      router.replace(data.role === "professor" ? "/admin/aulas" : "/admin");
    } catch {
      setError("Usuário ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-8 shadow-sm">
        <div className="mb-8 text-center flex flex-col items-center gap-3">
          <Logo variant="light" width={72} />
          <div>
            <h1 className="font-black text-primary-600 text-xl tracking-wide leading-none">Ravila&apos;s</h1>
            <div className="h-px bg-primary-100 my-1 mx-4" />
            <p className="font-bold text-primary-400 text-xs uppercase tracking-widest leading-none">English</p>
          </div>
          <p className="text-sm text-muted">Acesso restrito a funcionários</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Usuário</label>
            <Input type="text" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} autoFocus autoComplete="username" placeholder="Seu usuário" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
            <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Entrar</Button>
        </form>
      </div>
    </div>
  );
}
