"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { aulasService, type Aula } from "@/services/admin/aulas";
import { presencasService, type Presenca } from "@/services/admin/presencas";
import { matriculasService } from "@/services/admin/matriculas";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { alunosService, type Aluno } from "@/services/admin/alunos";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Combobox } from "@/components/ui/Combobox";
import { useToast } from "@/context/ToastContext";
import { authService } from "@/services/auth";

interface PresencaItem {
  aluno_id: number;
  nome: string;
  tipo: "matriculado" | "experimental" | "substituto";
  presente: boolean;
}

export default function PresencasPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [aula, setAula] = useState<Aula | null>(null);
  const [presencas, setPresencas] = useState<PresencaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = authService.getRole() === "admin";
  const [todasPessoas, setTodasPessoas] = useState<Pessoa[]>([]);
  const [todosAlunos, setTodosAlunos] = useState<Aluno[]>([]);
  const [addAlunoId, setAddAlunoId] = useState<number | string | null>(null);
  const [addTipo, setAddTipo] = useState<"experimental" | "substituto">("experimental");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const promises: Promise<any>[] = [
          aulasService.buscar(Number(id)),
          presencasService.listarPorAula(Number(id)),
        ];
        if (isAdmin) {
          promises.push(pessoasService.listar());
          promises.push(alunosService.listar());
        }
        const [aulaData, presencasData, pessoas, alunos] = await Promise.all(promises);
        setAula(aulaData);
        if (pessoas) setTodasPessoas(pessoas);
        if (alunos) setTodosAlunos(alunos);

        if (presencasData.length > 0) {
          setPresencas(presencasData.map((p) => ({
            aluno_id: p.aluno_id,
            nome: p.aluno?.pessoa.nome ?? p.pessoa?.nome ?? `Pessoa ${p.aluno_id}`,
            tipo: p.tipo,
            presente: p.presente,
          })));
        } else {
          const matriculasTurma = await matriculasService.listar({ turma_id: aulaData.turma_id, status: "ativa" });
          const items: PresencaItem[] = [];
          for (const m of matriculasTurma) {
            if (m.aluno) {
              items.push({
                aluno_id: m.aluno.pessoa_id,
                nome: m.aluno.pessoa.nome,
                tipo: "matriculado",
                presente: true,
              });
            }
          }
          setPresencas(items);
        }
      } finally { setLoading(false); }
    }
    load();
  }, [id]);

  function togglePresente(aluno_id: number) {
    setPresencas((prev) => prev.map((p) => p.aluno_id === aluno_id ? { ...p, presente: !p.presente } : p));
  }

  const [addingAluno, setAddingAluno] = useState(false);

  async function handleAddAluno() {
    if (!addAlunoId) { showToast("Selecione um aluno.", "error"); return; }
    const pessoaId = Number(addAlunoId);
    if (presencas.find((p) => p.aluno_id === pessoaId)) {
      showToast("Já está na lista.", "error"); return;
    }
    let nome: string | undefined;
    if (addTipo === "substituto") {
      nome = todosAlunos.find((a) => a.pessoa_id === pessoaId)?.pessoa.nome;
    } else {
      nome = todasPessoas.find((p) => p.id === pessoaId)?.nome;
    }
    if (!nome) return;
    setAddingAluno(true);
    try {
      await presencasService.adicionar(Number(id), { aluno_id: pessoaId, tipo: addTipo, presente: false });
      setPresencas((prev) => [...prev, { aluno_id: pessoaId, nome: nome!, tipo: addTipo, presente: false }]);
      setAddAlunoId(null);
      showToast(`${nome} adicionado à lista.`);
    } catch (err: any) {
      showToast(err.message ?? "Erro ao adicionar.", "error");
    } finally {
      setAddingAluno(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await presencasService.registrarBatch(Number(id), presencas.map((p) => ({
        aluno_id: p.aluno_id,
        tipo: p.tipo,
        presente: p.presente,
      })));
      showToast("Presenças salvas com sucesso!");
    } catch (err: any) {
      showToast(err.message ?? "Erro ao salvar presenças.", "error");
    } finally { setSaving(false); }
  }

  const aulaIniciou = (() => {
    if (!aula) return false;
    const [year, month, day] = aula.data.split("-").map(Number);
    const [hours, minutes] = aula.hora_inicio.split(":").map(Number);
    return new Date() >= new Date(year, month - 1, day, hours, minutes);
  })();

  const alunosPessoaIds = new Set(todosAlunos.map((a) => a.pessoa_id));
  const presencaIds = new Set(presencas.map((p) => p.aluno_id));

  const pessoaOptions = addTipo === "substituto"
    ? todosAlunos
        .filter((a) => !presencaIds.has(a.pessoa_id))
        .map((a) => ({ value: a.pessoa_id, label: `${a.pessoa.nome} — ${a.pessoa.cpf}` }))
    : todasPessoas
        .filter((p) => !alunosPessoaIds.has(p.id) && !presencaIds.has(p.id))
        .map((p) => ({ value: p.id, label: `${p.nome} — ${p.cpf}` }));

  if (loading) {
    return <div className="flex justify-center h-40 items-center"><span className="w-6 h-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Presenças</h1>
        {aula && (
          <p className="text-sm text-muted mt-1">
            {aula.turma?.nome ?? `Turma ${aula.turma_id}`} · {new Date(aula.data + "T00:00:00").toLocaleDateString("pt-BR")} · {aula.hora_inicio.slice(0,5)} – {aula.hora_fim.slice(0,5)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {presencas.length === 0 && <p className="text-sm text-muted">Nenhum aluno matriculado nesta turma.</p>}
        {presencas.map((p) => (
          <div key={p.aluno_id} className="flex items-center justify-between bg-surface border border-border rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={p.presente}
                onChange={() => aulaIniciou && togglePresente(p.aluno_id)}
                disabled={!aulaIniciou}
                className="accent-primary-600 w-4 h-4 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <span className="text-sm font-medium text-foreground">{p.nome}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.tipo === "matriculado" ? "primary" : p.tipo === "experimental" ? "warning" : "neutral"}>
                {p.tipo}
              </Badge>
              <Badge variant={p.presente ? "success" : "error"}>{p.presente ? "Presente" : "Ausente"}</Badge>
            </div>
          </div>
        ))}
      </div>

      {isAdmin && <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Adicionar aluno extra</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <Combobox options={pessoaOptions} value={addAlunoId} onChange={setAddAlunoId} placeholder="Buscar aluno..." />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setAddTipo("experimental"); setAddAlunoId(null); }}
              className={["px-3 py-2 rounded-md text-sm border transition-colors", addTipo === "experimental" ? "bg-primary-600 text-on-primary border-primary-600" : "border-border text-foreground hover:bg-surface"].join(" ")}
            >
              Experimental
            </button>
            <button
              type="button"
              onClick={() => { setAddTipo("substituto"); setAddAlunoId(null); }}
              className={["px-3 py-2 rounded-md text-sm border transition-colors", addTipo === "substituto" ? "bg-primary-600 text-on-primary border-primary-600" : "border-border text-foreground hover:bg-surface"].join(" ")}
            >
              Reposição
            </button>
          </div>
          <Button type="button" variant="outline" onClick={handleAddAluno} loading={addingAluno}>Adicionar</Button>
        </div>
      </div>}

      {!aulaIniciou && (
        <p className="text-sm text-muted">
          Presenças só podem ser registradas após o início da aula ({aula?.hora_inicio.slice(0,5)}).
        </p>
      )}
      <Button onClick={handleSave} loading={saving} disabled={!aulaIniciou}>Salvar presenças</Button>
    </div>
  );
}
