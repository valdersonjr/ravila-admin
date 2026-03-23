"use client";
import { useEffect, useState } from "react";
import { turmasService, type Turma } from "@/services/admin/turmas";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { authService } from "@/services/auth";
import Link from "next/link";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const isAdmin = authService.getRole() === "admin";

  useEffect(() => {
    setLoading(true);
    turmasService.listar(status ? { status } : undefined).then(setTurmas).finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Turmas</h1>
        {isAdmin && (
          <Link href="/admin/turmas/nova"><Button>+ Nova Turma</Button></Link>
        )}
      </div>

      <Select
        options={[
          { value: "", label: "Todos os status" },
          { value: "ativa", label: "Ativa" },
          { value: "encerrada", label: "Encerrada" },
        ]}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-48"
      />

      {loading ? (
        <div className="flex justify-center h-20 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>
      ) : (
        <Table<Turma>
          keyExtractor={(t) => t.id}
          data={turmas}
          columns={[
            { header: "Nome", render: (t) => <Link href={`/admin/turmas/${t.id}`} className="text-primary-600 hover:underline font-medium">{t.nome}</Link> },
            { header: "Nível", render: (t) => t.nivel?.nome ?? "-" },
            { header: "Professor", render: (t) => t.professor?.pessoa.nome ?? "-" },
            {
              header: "Horários",
              render: (t) => t.horarios.length === 0 ? "-" : t.horarios.map(h => `${DIAS[h.dia_semana]} ${h.hora_inicio.slice(0,5)}`).join(", "),
            },
            {
              header: "Status",
              render: (t) => <Badge variant={t.status === "ativa" ? "success" : "neutral"}>{t.status}</Badge>,
            },
            {
              header: "Ações",
              render: (t) => <Link href={`/admin/turmas/${t.id}`} className="text-primary-600 hover:underline text-sm">Ver detalhes</Link>,
            },
          ]}
        />
      )}
    </div>
  );
}
