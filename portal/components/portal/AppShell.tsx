"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { House, CalendarDays, UserRound, BookOpen, Flame } from "lucide-react";
import { authService } from "@/services/auth";
import { Logo } from "@/components/ui/Logo";

interface AppShellProps {
  children: React.ReactNode;
  streak?: number;
}

const NAV = [
  { href: "/home", label: "Início", Icon: House },
  { href: "/atividade", label: "Atividade", Icon: CalendarDays },
  { href: "/pratica", label: "Aprender", Icon: BookOpen },
  { href: "/perfil", label: "Perfil", Icon: UserRound },
];

export function AppShell({ children, streak = 0 }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [nome, setNome] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    setNome(authService.getNome() ?? "Aluno");
    authService.me().then((me) => {
      if (me.tem_foto) {
        authService.getFotoUrl().then((r) => setFotoUrl(r.url)).catch(() => {});
      }
    }).catch(() => {});

    function onFotoAtualizada(e: Event) {
      setFotoUrl((e as CustomEvent<{ url: string }>).detail.url);
    }
    window.addEventListener("foto-atualizada", onFotoAtualizada);
    return () => window.removeEventListener("foto-atualizada", onFotoAtualizada);
  }, []);

  const initials = nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface border-b border-border px-5 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-black select-none overflow-hidden">
              {fotoUrl
                ? <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
                : initials}
            </div>
            <div>
              <p className="text-xs text-muted leading-none">Olá,</p>
              <p className="text-sm font-bold text-foreground leading-snug">{nome.split(" ")[0]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1 bg-primary-50 border border-primary-100 rounded-full px-3 py-1">
                <Flame size={12} className="text-orange-500" />
                <span className="text-xs font-bold text-primary-700">{streak} {streak === 1 ? "dia" : "dias"}</span>
              </div>
            )}
            <Logo variant="light" width={30} />
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 overflow-auto pb-24 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-2xl transition-all ${
                  active ? "text-primary-600 bg-primary-50" : "text-muted"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

