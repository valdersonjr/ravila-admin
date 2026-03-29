"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { authService } from "@/services/auth";

export default function AlterarSenhaPage() {
  const router = useRouter();
  const [form, setForm] = useState({ senha_antiga: "", senha: "", confirmar: "" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  function setField(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErro(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.senha !== form.confirmar) {
      setErro("A nova senha e a confirmação não coincidem.");
      return;
    }
    if (form.senha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await authService.atualizarPerfil({ senha: form.senha, senha_antiga: form.senha_antiga });
      setSucesso(true);
      setForm({ senha_antiga: "", senha: "", confirmar: "" });
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppShell>
      <div className="px-5 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted hover:text-foreground transition-colors">
            <ChevronLeft size={22} strokeWidth={1.75} />
          </button>
          <h1 className="text-xl font-black text-foreground">Alterar senha</h1>
        </div>

        {sucesso && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-800 font-medium">
            Senha alterada com sucesso!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
            <PasswordField
              label="Senha atual"
              value={form.senha_antiga}
              onChange={(v) => setField("senha_antiga", v)}
              autoComplete="current-password"
            />
            <PasswordField
              label="Nova senha"
              value={form.senha}
              onChange={(v) => setField("senha", v)}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirmar nova senha"
              value={form.confirmar}
              onChange={(v) => setField("confirmar", v)}
              autoComplete="new-password"
            />
          </div>

          {erro && (
            <p className="text-sm text-rose-600 font-medium px-1">{erro}</p>
          )}

          <button
            type="submit"
            disabled={salvando || !form.senha_antiga || !form.senha || !form.confirmar}
            className="w-full rounded-2xl bg-primary-600 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center px-5 py-4 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted mb-1">{label}</p>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          placeholder="••••••••"
          required
        />
      </div>
      <button
        type="button"
        onClick={() => setShow((p) => !p)}
        className="text-xs text-muted hover:text-foreground shrink-0"
      >
        {show ? "ocultar" : "mostrar"}
      </button>
    </div>
  );
}
