"use client";
import { MateriaisSection } from "@/components/admin/MateriaisSection";

export default function MateriaisPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Materiais</h1>
        <p className="text-sm text-muted mt-1">
          Materiais avulsos disponíveis para alunos — não vinculados a uma aula específica.
        </p>
      </div>

      <MateriaisSection />
    </div>
  );
}
