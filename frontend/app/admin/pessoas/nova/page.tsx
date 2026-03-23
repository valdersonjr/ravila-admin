"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { pessoasService, type PessoaCreate } from "@/services/admin/pessoas";
import { getErrorMessage } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { mascaraCpf } from "@/lib/masks";
import { Field } from "@/components/ui/Field";

export default function NovaPessoaPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<PessoaCreate>({ nome: "", cpf: "", rg: "", email: "", telefone: "", endereco: "", menor_de_idade: false });
  const [loading, setLoading] = useState(false);

  function set(field: keyof PessoaCreate, value: string) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await pessoasService.criar({ ...form, cpf: form.cpf ? form.cpf.replace(/\D/g, "") : undefined });
      showToast("Pessoa criada com sucesso!");
      router.push("/admin/pessoas");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar pessoa."), "error");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Nova Pessoa</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome *"><Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required placeholder="Nome completo" /></Field>
        <Field label="CPF">
          <Input inputMode="numeric" value={form.cpf} onChange={(e) => set("cpf", mascaraCpf(e.target.value))} placeholder="000.000.000-00" />
        </Field>
        <Field label="RG">
          <Input value={form.rg} onChange={(e) => set("rg", e.target.value)} placeholder="Ex: 4315247" />
        </Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Telefone"><Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></Field>
        <Field label="Endereço">
          <textarea
            value={form.endereco}
            onChange={(e) => set("endereco", e.target.value)}
            rows={2}
            placeholder="Rua, número, bairro..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </Field>
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

