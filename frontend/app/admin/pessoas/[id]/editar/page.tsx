"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { pessoasService, type PessoaCreate } from "@/services/admin/pessoas";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { mascaraCpf } from "@/lib/masks";

export default function EditarPessoaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<PessoaCreate>({ nome: "", cpf: "", email: "", telefone: "", data_nascimento: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    pessoasService.buscar(Number(id)).then((p) => setForm({ nome: p.nome, cpf: mascaraCpf(p.cpf), email: p.email ?? "", telefone: p.telefone ?? "", data_nascimento: p.data_nascimento ?? "" }));
  }, [id]);

  function set(field: keyof PessoaCreate, value: string) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await pessoasService.atualizar(Number(id), { ...form, cpf: form.cpf.replace(/\D/g, "") });
      showToast("Pessoa atualizada!");
      router.push("/admin/pessoas");
    } catch (err: any) {
      showToast(err.message ?? "Erro ao atualizar.", "error");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Editar Pessoa</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome *"><Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required /></Field>
        <Field label="CPF *"><Input inputMode="numeric" value={form.cpf} onChange={(e) => set("cpf", mascaraCpf(e.target.value))} placeholder="000.000.000-00" required /></Field>
        <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Telefone"><Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} /></Field>
        <Field label="Data de nascimento"><Input type="date" value={form.data_nascimento ?? ""} onChange={(e) => set("data_nascimento", e.target.value)} /></Field>
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Salvar</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-foreground mb-1">{label}</label>{children}</div>;
}
