"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth";

const links = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/alunos", label: "Alunos", exact: false },
  { href: "/admin/professores", label: "Professores", exact: false },
  { href: "/admin/turmas", label: "Turmas", exact: false },
  { href: "/admin/aulas", label: "Aulas", exact: false },
  { href: "/admin/matriculas", label: "Matrículas", exact: false },
  { href: "/admin/pagamentos/alunos", label: "Pagamentos Alunos", exact: false },
  { href: "/admin/pagamentos/professores", label: "Pagamentos Professores", exact: false },
  { href: "/admin/pessoas", label: "Pessoas", exact: false },
  { href: "/admin/niveis", label: "Níveis", exact: false },
  { href: "/admin/users", label: "Usuários", exact: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setRole(authService.getRole());
    setNome(authService.getNome());
  }, []);

  const visibleLinks = role === "admin" ? links : links.filter(l => ["/admin", "/admin/turmas", "/admin/aulas"].includes(l.href));

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-surface border-r border-border overflow-y-auto">
      <div className="px-6 py-5 border-b border-border">
        <span className="font-bold text-foreground text-lg">Ravilas English</span>
        <p className="text-xs text-muted mt-0.5">Painel Admin</p>
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
          <button onClick={logout} className="w-full flex items-center px-3 py-2 rounded-md text-sm text-foreground hover:bg-border transition-colors">
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
