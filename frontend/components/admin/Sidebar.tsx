"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth";
import { Logo } from "@/components/ui/Logo";

type NavLink = { href: string; label: string; exact: boolean; roles: string[] };

const links: NavLink[] = [
  { href: "/admin",                        label: "Dashboard",              exact: true,  roles: ["admin", "secretario"] },
  { href: "/admin/alunos",                 label: "Alunos",                 exact: false, roles: ["admin", "secretario"] },
  { href: "/admin/contratos",              label: "Contratos",              exact: false, roles: ["admin", "secretario"] },
  { href: "/admin/matriculas",             label: "Matrículas",             exact: false, roles: ["admin", "secretario", "professor"] },
  { href: "/admin/turmas",                 label: "Turmas",                 exact: false, roles: ["admin", "secretario", "professor"] },
  { href: "/admin/aulas",                  label: "Aulas",                  exact: false, roles: ["admin", "secretario", "professor"] },
  { href: "/admin/materiais",              label: "Materiais",              exact: false, roles: ["admin", "secretario", "professor"] },
  { href: "/admin/questoes",              label: "Questões",               exact: false, roles: ["admin", "secretario", "professor"] },
  { href: "/admin/avaliacoes",            label: "Avaliações",             exact: false, roles: ["admin", "secretario", "professor"] },
  { href: "/admin/nivel-ingles",          label: "Nível de Inglês",        exact: false, roles: ["admin", "secretario", "professor"] },
  { href: "/admin/professores",            label: "Professores",            exact: false, roles: ["admin", "secretario"] },
  { href: "/admin/pessoas",                label: "Pessoas",                exact: false, roles: ["admin", "secretario"] },
  { href: "/admin/users",                  label: "Usuários",               exact: false, roles: ["admin"] },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [pessoaId, setPessoaId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setRole(authService.getRole());
    setNome(authService.getNome());
    setPessoaId(authService.getPessoaId());
  }, []);

  // Fecha sidebar ao navegar no mobile
  useEffect(() => { onClose(); }, [pathname]);

  const extraProfessorLinks: NavLink[] = pessoaId ? [
    { href: `/admin/professores/${pessoaId}/dashboard`, label: "Dashboard",    exact: false, roles: ["professor"] },
    { href: `/admin/professores/${pessoaId}/agenda`,    label: "Agenda",       exact: false, roles: ["professor"] },
  ] : [];

  const allLinks = [...extraProfessorLinks, ...links];
  const visibleLinks = role ? allLinks.filter((l) => l.roles.includes(role)) : [];

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={[
        "fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-surface border-r border-border overflow-y-auto transition-transform duration-200",
        "md:sticky md:top-0 md:h-screen md:translate-x-0 md:z-auto",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="light" width={48} />
            <div>
              <p className="font-black text-primary-600 text-base tracking-wide leading-none">Ravila&apos;s</p>
              <div className="h-px bg-primary-100 my-0.5" />
              <p className="font-bold text-primary-400 text-[10px] uppercase tracking-widest leading-none">English</p>
              <p className="text-[10px] text-muted mt-1">Painel Admin</p>
            </div>
          </div>
          {/* Botão fechar no mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-md text-muted hover:text-foreground hover:bg-border transition-colors"
            aria-label="Fechar menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleLinks.map(({ href, label, exact }) => (
            <Link key={href} href={href}
              className={["flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors", isActive(href, exact) ? "bg-primary-600 text-on-primary" : "text-foreground hover:bg-border"].join(" ")}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-border space-y-3">
          {mounted && nome && (
            <div className="px-1">
              <p className="text-sm font-medium text-foreground truncate">{nome}</p>
              <p className="text-xs text-muted capitalize">{role}</p>
            </div>
          )}
          <div className="space-y-1">
            {mounted && (
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full flex items-center px-3 py-2 rounded-md text-sm text-foreground hover:bg-border transition-colors">
                {theme === "dark" ? "☀ Tema claro" : "☾ Tema escuro"}
              </button>
            )}
            <Link
              href="/admin/perfil"
              className={["flex items-center px-3 py-2 rounded-md text-sm transition-colors", isActive("/admin/perfil", false) ? "bg-primary-600 text-on-primary font-medium" : "text-foreground hover:bg-border"].join(" ")}
            >
              Meu perfil
            </Link>
            <button onClick={logout} className="w-full flex items-center px-3 py-2 rounded-md text-sm text-foreground hover:bg-border transition-colors">
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
