"use client";
import { useEffect, useState } from "react";
import { authService } from "@/services/auth";
import { getErrorMessage } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";

export default function PerfilPage() {
  const { showToast } = useToast();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingsenha, setSavingsenha] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await authService.me();
        setNome(data.nome ?? "");
        setEmail(data.email ?? "");
        setTelefone(data.telefone ?? "");
        if (data.tem_foto) {
          try {
            const url = await authService.fotoUrl();
            setFotoUrl(url);
          } catch {
            // foto indisponivel — nao bloqueia o resto do perfil
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      showToast("Arquivo muito grande. Máximo 200 MB.", "error");
      e.target.value = "";
      return;
    }
    setUploadingFoto(true);
    try {
      await authService.uploadFoto(file);
      const url = await authService.fotoUrl();
      setFotoUrl(url);
      showToast("Foto atualizada!");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao enviar foto."), "error");
    } finally {
      setUploadingFoto(false);
      e.target.value = "";
    }
  }

  async function handleSalvarDados(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await authService.atualizarPerfil({ nome, email: email || undefined, telefone: telefone || undefined });
      showToast("Dados atualizados com sucesso!");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao salvar."), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSalvarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      showToast("As senhas não coincidem.", "error");
      return;
    }
    if (novaSenha.length < 6) {
      showToast("A senha deve ter ao menos 6 caracteres.", "error");
      return;
    }
    setSavingsenha(true);
    try {
      await authService.atualizarPerfil({ senha: novaSenha });
      showToast("Senha alterada com sucesso!");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao alterar senha."), "error");
    } finally {
      setSavingsenha(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center h-40 items-center">
        <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-lg">
      <h1 className="text-2xl font-bold text-foreground">Meu perfil</h1>

      {/* Foto */}
      <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-6">
        <div className="relative shrink-0">
          {fotoUrl ? (
            <img src={fotoUrl} alt="Foto de perfil" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold border-2 border-border">
              {nome.charAt(0).toUpperCase()}
            </div>
          )}
          {uploadingFoto && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Foto de perfil</p>
          <p className="text-xs text-muted">JPG, PNG ou WebP. Máx. 200 MB.</p>
          <label className="cursor-pointer inline-block mt-2">
            <span className="text-xs text-primary-600 hover:underline">
              {fotoUrl ? "Trocar foto" : "Adicionar foto"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFoto}
              disabled={uploadingFoto}
            />
          </label>
        </div>
      </div>

      {/* Dados pessoais */}
      <form onSubmit={handleSalvarDados} className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Dados pessoais</h2>
        <Field label="Nome *">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>
        <Field label="E-mail">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
        </Field>
        <Field label="Telefone">
          <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
        </Field>
        <Button type="submit" loading={saving}>Salvar dados</Button>
      </form>

      {/* Alterar senha */}
      <form onSubmit={handleSalvarSenha} className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Alterar senha</h2>
        <Field label="Nova senha * (mínimo 6 caracteres)">
          <Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required autoComplete="new-password" />
        </Field>
        <Field label="Confirmar nova senha *">
          <Input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required autoComplete="new-password" />
        </Field>
        <Button type="submit" loading={savingsenha}>Alterar senha</Button>
      </form>
    </div>
  );
}
