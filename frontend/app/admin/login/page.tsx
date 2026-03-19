"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth";
import { mascaraCpf } from "@/lib/masks";

export default function LoginPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleCpf(e: React.ChangeEvent<HTMLInputElement>) {
    setCpf(mascaraCpf(e.target.value));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authService.login(cpf.replace(/\D/g, ""), senha);
      router.replace("/admin");
    } catch {
      setError("CPF ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Ravilas English</h1>
          <p className="text-sm text-muted mt-1">Acesso restrito a funcionários</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">CPF</label>
            <Input type="text" inputMode="numeric" value={cpf} onChange={handleCpf} placeholder="000.000.000-00" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
            <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Entrar</Button>
        </form>
      </div>
    </div>
  );
}
