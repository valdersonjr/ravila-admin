"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { pessoasService, type PessoaCreate } from "@/services/admin/pessoas";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { mascaraCpf } from "@/lib/masks";

export default function NovaPessoaPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<PessoaCreate>({ nome: "", cpf: "", email: "", telefone: "", data_nascimento: "", menor_de_idade: false });
  const [loading, setLoading] = useState(false);

  function set(field: keyof PessoaCreate, value: string) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await pessoasService.criar({ ...form, cpf: form.cpf ? form.cpf.replace(/\D/g, "") : undefined });
      showToast("Pessoa criada com sucesso!");
      router.push("/admin/pessoas");
    } catch (err: any) {
      showToast(err.message ?? "Erro ao criar pessoa.", "error");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Nova Pessoa</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome *"><Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required /></Field>
        <Field label={form.menor_de_idade ? "CPF" : "CPF *"}>
          <Input inputMode="numeric" value={form.cpf} onChange={(e) => set("cpf", mascaraCpf(e.target.value))} placeholder="000.000.000-00" required={!form.menor_de_idade} />
        </Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Telefone"><Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></Field>
        <Field label="Data de nascimento"><Input type="date" value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} /></Field>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!form.menor_de_idade}
            onChange={(e) => setForm((f) => ({ ...f, menor_de_idade: e.target.checked }))}
            className="w-4 h-4 accent-primary-600"
          />
          <span className="text-sm font-medium text-foreground">Menor de 18 anos</span>
        </label>
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
