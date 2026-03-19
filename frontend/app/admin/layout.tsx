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
        <Sidebar />
        <main className="flex-1 p-6 bg-background overflow-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
