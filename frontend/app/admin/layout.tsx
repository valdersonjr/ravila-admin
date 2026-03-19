"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services/auth";
import { Sidebar } from "@/components/admin/Sidebar";
import { ToastProvider } from "@/context/ToastContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoginPage) return;
    const authenticated = authService.isAuthenticated();
    setIsAuthenticated(authenticated);
    if (!authenticated) router.replace("/admin/login");
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* Topbar mobile */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-14 bg-surface border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-foreground hover:bg-border transition-colors"
            aria-label="Abrir menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-foreground text-base">Ravilas English</span>
        </div>

        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-4 md:p-6 bg-background overflow-auto mt-14 md:mt-0">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
