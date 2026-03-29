"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, UserRound, FileText, Bell, KeyRound } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { authService } from "@/services/auth";

export default function PerfilPage() {
  const router = useRouter();
  const nome = authService.getNome() ?? "Aluno";
  const initials = nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  function handleLogout() {
    authService.logout();
    router.replace("/login");
  }

  return (
    <AppShell>
      <div className="px-5 py-6 space-y-6">
        <h1 className="text-xl font-black text-foreground">Perfil</h1>

        {/* Avatar + nome */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-black">
            {initials}
          </div>
          <p className="text-lg font-bold text-foreground">{nome}</p>
          <span className="text-xs bg-primary-100 text-primary-700 font-semibold rounded-full px-3 py-1">Aluno</span>
        </div>

        {/* Opções */}
        <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
          <MenuItem label="Meus dados" Icon={UserRound} onClick={() => router.push("/meus-dados")} />
          <MenuItem label="Meu contrato" Icon={FileText} onClick={() => router.push("/meu-contrato")} />
          <MenuItem label="Alterar senha" Icon={KeyRound} onClick={() => router.push("/alterar-senha")} />
          <MenuItem label="Notificações" Icon={Bell} onClick={() => {}} comingSoon />
        </div>

        {/* Sair */}
        <button
          onClick={handleLogout}
          className="w-full rounded-2xl border border-rose-200 bg-rose-50 py-4 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100"
        >
          Sair da conta
        </button>
      </div>
    </AppShell>
  );
}

function MenuItem({
  label,
  Icon,
  onClick,
  comingSoon,
}: {
  label: string;
  Icon: React.ElementType;
  onClick: () => void;
  comingSoon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={comingSoon}
      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-background transition-colors disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <Icon size={18} strokeWidth={1.75} className="text-muted" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {comingSoon && (
          <span className="text-xs bg-border text-muted rounded-full px-2 py-0.5">em breve</span>
        )}
        <ChevronRight size={16} strokeWidth={1.75} className="text-muted" />
      </div>
    </button>
  );
}
