"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (authService.isAuthenticated()) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted text-sm">Carregando...</p>
    </main>
  );
}
