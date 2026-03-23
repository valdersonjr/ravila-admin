"use client";
import Link from "next/link";
import { authService } from "@/services/auth";

export default function NotFound() {
  const role = authService.getRole();
  const pessoaId = authService.getPessoaId();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <p className="text-6xl font-bold text-foreground">404</p>
      <p className="text-lg text-muted">Página não encontrada.</p>
      {role === "professor" && pessoaId ? (
        <Link
          href={`/admin/professores/${pessoaId}/dashboard`}
          className="mt-2 px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Voltar ao meu dashboard
        </Link>
      ) : (
        <Link
          href="/admin"
          className="mt-2 px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Voltar ao início
        </Link>
      )}
    </div>
  );
}
