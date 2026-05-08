"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { reposicoesService, type ReposicaoPendente } from "@/services/admin/reposicoes";
import { professoresService, type Professor } from "@/services/admin/professores";
import { aulasService } from "@/services/admin/aulas";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { authService } from "@/services/auth";

export default function NovaAulaReposicaoPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const isProfessor = authService.getRole() === "professor";
  const pessoaId = authService.getPessoaId();

  const [reposicoes, setReposicoes] = useState<ReposicaoPendente[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [professorId, setProfessorId] = useState<number | string | null>(
    isProfessor && pessoaId ? pessoaId : null
  );
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");

  useEffect(() => {
    Promise.all([
      reposicoesService.listar(),
      isProfessor ? Promise.resolve([]) : professoresService.listar(),
    ])
      .then(([repos, profs]) => {
        setReposicoes(repos as ReposicaoPendente[]);
        if (profs) setProfessores((profs as Professor[]).filter((p) => p.ativo));
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleId(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === reposicoes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reposicoes.map((r) => r.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) { showToast("Selecione ao menos uma reposição.", "error"); return; }
    if (!professorId) { showToast("Selecione um professor.", "error"); return; }
    if (!horaInicio || !horaFim) { showToast("Informe o horário da aula.", "error"); return; }

    setSaving(true);
    try {
      const aula = await aulasService.criarReposicao({
        reposicao_ids: Array.from(selectedIds),
        professor_id: Number(professorId),
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
      });
      showToast("Aula de reposição agendada!");
      router.push(`/admin/aulas/${aula.id}/presencas`);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao agendar reposição."), "error");
    } finally {
      setSaving(false);
    }
  }

  const profOptions = professores.map((p) => ({ value: p.pessoa_id, label: p.pessoa.nome }));
  const allSelected = reposicoes.length > 0 && selectedIds.size === reposicoes.length;

  if (loading) {
    return (
      <div className="flex justify-center h-40 items-center">
        <span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Nova aula de reposição</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Alunos com reposição pendente</h2>
            {reposicoes.length > 0 && (
              <button type="button" onClick={toggleAll} className="text-xs text-primary-600 hover:underline">
                {allSelected ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            )}
          </div>

          {reposicoes.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma reposição pendente.</p>
          ) : (
            <div className="space-y-2">
              {reposicoes.map((r) => {
                const nome = r.aluno?.pessoa.nome ?? `Aluno ${r.aluno_id}`;
                const dataFalta = r.aula_origem
                  ? new Date(r.aula_origem.data + "T00:00:00").toLocaleDateString("pt-BR")
                  : "-";
                const horario = r.aula_origem
                  ? `${r.aula_origem.hora_inicio.slice(0, 5)} – ${r.aula_origem.hora_fim.slice(0, 5)}`
                  : "";
                return (
                  <label
                    key={r.id}
                    className="flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-3 cursor-pointer hover:bg-surface transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleId(r.id)}
                      className="accent-primary-600 w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{nome}</p>
                      <p className="text-xs text-muted">Faltou em {dataFalta}{horario ? ` · ${horario}` : ""}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Dados da aula</h2>

          {!isProfessor && (
            <Field label="Professor">
              <Combobox
                options={profOptions}
                value={professorId}
                onChange={setProfessorId}
                placeholder="Selecione um professor..."
              />
            </Field>
          )}

          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Field>

          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="Início">
                <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Fim">
                <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} required />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" loading={saving} disabled={selectedIds.size === 0}>
            Agendar {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
        </div>
      </form>
    </div>
  );
}
