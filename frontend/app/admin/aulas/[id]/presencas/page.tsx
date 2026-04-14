"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { aulasService, type Aula } from "@/services/admin/aulas";
import { getErrorMessage } from "@/lib/utils";
import { presencasService, type Presenca } from "@/services/admin/presencas";
import { matriculasService } from "@/services/admin/matriculas";
import { pessoasService, type Pessoa } from "@/services/admin/pessoas";
import { alunosService, type Aluno } from "@/services/admin/alunos";
import { reposicoesService, type ReposicaoPendente } from "@/services/admin/reposicoes";
import { MateriaisSection } from "@/components/admin/MateriaisSection";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Combobox } from "@/components/ui/Combobox";
import { useToast } from "@/context/ToastContext";
import { authService } from "@/services/auth";
import Link from "next/link";

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

  const [descricao, setDescricao] = useState("");
  const [editandoDescricao, setEditandoDescricao] = useState(false);
  const [savingDescricao, setSavingDescricao] = useState(false);

  const [conteudoDado, setConteudoDado] = useState("");
  const [editandoConteudo, setEditandoConteudo] = useState(false);
  const [savingConteudo, setSavingConteudo] = useState(false);

  const isAdmin = ["admin", "secretario", "professor"].includes(authService.getRole() ?? "");
  const [todasPessoas, setTodasPessoas] = useState<Pessoa[]>([]);
  const [todosAlunos, setTodosAlunos] = useState<Aluno[]>([]);
  const [reposicoesPendentes, setReposicoesPendentes] = useState<ReposicaoPendente[]>([]);
  const [addAlunoId, setAddAlunoId] = useState<number | string | null>(null);
  const [addTipo, setAddTipo] = useState<"experimental" | "substituto">("experimental");
  const [gerandoReposicao, setGerandoReposicao] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const promises: Promise<unknown>[] = [
          aulasService.buscar(Number(id)),
          presencasService.listarPorAula(Number(id)),
        ];
        if (isAdmin) {
          promises.push(pessoasService.listar({ page_size: 500 }));
          promises.push(alunosService.listar());
          promises.push(reposicoesService.listar());
        }
        const [aulaData, presencasData, pessoas, alunos, reposicoes] = await Promise.all(promises);
        const aula = aulaData as Aula;
        setAula(aula);
        setDescricao(aula.descricao ?? "");
        setConteudoDado(aula.conteudo_dado ?? "");
        if (pessoas) setTodasPessoas((pessoas as { items: Pessoa[] }).items);
        if (alunos) setTodosAlunos((alunos as { items: Aluno[] }).items);
        if (reposicoes) setReposicoesPendentes(reposicoes as ReposicaoPendente[]);

        const presencasSalvas = new Map<number, Presenca>(
          (presencasData as Presenca[]).map((p: Presenca) => [p.aluno_id, p])
        );

        const items: PresencaItem[] = [];

        if (aula.turma_id) {
          // Aula de turma: popula a lista a partir das matrículas ativas
          const matriculasTurma = await matriculasService.listar({ turma_id: aula.turma_id, status: "ativa" });
          for (const m of matriculasTurma) {
            if (!m.aluno) continue;
            const salva = presencasSalvas.get(m.aluno.pessoa_id);
            items.push({
              aluno_id: m.aluno.pessoa_id,
              nome: m.aluno.pessoa.nome,
              tipo: "matriculado",
              presente: salva ? salva.presente : false,
            });
            presencasSalvas.delete(m.aluno.pessoa_id);
          }
        } else if (aula.aluno_id) {
          // Aula avulsa/particular: aluno é o da própria aula
          const salva = presencasSalvas.get(aula.aluno_id);
          items.push({
            aluno_id: aula.aluno_id,
            nome: aula.aluno_nome_snapshot ?? `Pessoa ${aula.aluno_id}`,
            tipo: "experimental",
            presente: salva ? salva.presente : false,
          });
          presencasSalvas.delete(aula.aluno_id);
        }

        // Participantes extras adicionados manualmente (experimentais, substitutos)
        for (const p of presencasSalvas.values()) {
          items.push({
            aluno_id: p.aluno_id,
            nome: p.aluno?.pessoa.nome ?? p.pessoa?.nome ?? `Pessoa ${p.aluno_id}`,
            tipo: p.tipo as PresencaItem["tipo"],
            presente: p.presente,
          });
        }

        setPresencas(items);
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
    const nomeSalvo = nome;
    setAddingAluno(true);
    try {
      await presencasService.adicionar(Number(id), { aluno_id: pessoaId, tipo: addTipo, presente: false });

      // Se for reposição, marca a reposição pendente como usada
      if (addTipo === "substituto") {
        const repPendente = reposicoesPendentes.find((r) => r.aluno_id === pessoaId);
        if (repPendente) {
          await reposicoesService.usar(repPendente.id, Number(id));
          setReposicoesPendentes((prev) => prev.filter((r) => r.id !== repPendente.id));
        }
      }

      setPresencas((prev) => [...prev, { aluno_id: pessoaId, nome: nomeSalvo, tipo: addTipo, presente: false }]);
      setAddAlunoId(null);
      showToast(`${nome} adicionado à lista.`);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao adicionar."), "error");
    } finally {
      setAddingAluno(false);
    }
  }

  async function handleSaveDescricao() {
    setSavingDescricao(true);
    try {
      const updated = await aulasService.atualizarDescricao(Number(id), descricao || null);
      setAula(updated);
      setEditandoDescricao(false);
      showToast("Descrição salva!");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao salvar descrição."), "error");
    } finally {
      setSavingDescricao(false);
    }
  }

  async function handleSaveConteudo() {
    setSavingConteudo(true);
    try {
      const updated = await aulasService.atualizarConteudo(Number(id), conteudoDado || null);
      setAula(updated);
      setEditandoConteudo(false);
      showToast("Conteúdo salvo!");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao salvar conteúdo."), "error");
    } finally {
      setSavingConteudo(false);
    }
  }

  async function handleGerarReposicao(alunoId: number) {
    setGerandoReposicao(alunoId);
    try {
      const nova = await reposicoesService.gerar(alunoId, Number(id));
      setReposicoesPendentes((prev) => [...prev, nova]);
      showToast("Reposição gerada!");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao gerar reposição."), "error");
    } finally {
      setGerandoReposicao(null);
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
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao salvar presenças."), "error");
    } finally { setSaving(false); }
  }

  const aulaIniciou = (() => {
    if (!aula) return false;
    const [year, month, day] = aula.data.split("-").map(Number);
    const [hours, minutes] = aula.hora_inicio.split(":").map(Number);
    return new Date() >= new Date(year, month - 1, day, hours, minutes);
  })();

  const presencaIds = new Set(presencas.map((p) => p.aluno_id));
  const alunosPessoaIds = new Set(todosAlunos.map((a) => a.pessoa_id));

  // Para reposição: mostra apenas alunos com reposição pendente que ainda não estão na lista
  const reposicaoOptions = reposicoesPendentes
    .filter((r) => !presencaIds.has(r.aluno_id))
    .map((r) => ({
      value: r.aluno_id,
      label: r.aluno?.pessoa.nome ?? `Aluno ${r.aluno_id}`,
    }));

  const pessoaOptions = addTipo === "substituto"
    ? reposicaoOptions
    : todasPessoas
        .filter((p) => !alunosPessoaIds.has(p.id) && !presencaIds.has(p.id))
        .map((p) => ({ value: p.id, label: p.nome }));

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

      {/* Avaliação vinculada */}
      {aula?.avaliacao_id && (
        <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted mb-0.5">Avaliação desta aula</p>
            <p className="text-sm font-semibold text-foreground">{aula.avaliacao_titulo}</p>
          </div>
          <Link
            href={`/admin/avaliacoes/${aula.avaliacao_id}`}
            className="text-sm text-primary-600 hover:underline shrink-0"
          >
            Ver avaliação
          </Link>
        </div>
      )}

      {/* Descrição / Observações */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Observações</h2>
          {!editandoDescricao && (
            <button
              type="button"
              onClick={() => setEditandoDescricao(true)}
              className="text-xs text-primary-600 hover:underline"
            >
              {descricao ? "Editar" : "Adicionar"}
            </button>
          )}
        </div>
        {editandoDescricao ? (
          <div className="space-y-2">
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Escreva observações sobre a aula..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setDescricao(aula?.descricao ?? ""); setEditandoDescricao(false); }}
                disabled={savingDescricao}
              >
                Cancelar
              </Button>
              <Button type="button" size="sm" loading={savingDescricao} onClick={handleSaveDescricao}>
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted whitespace-pre-wrap">{descricao || "Nenhuma observação registrada."}</p>
        )}
      </div>

      {/* Conteúdo dado */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Conteúdo dado</h2>
          {!editandoConteudo && (
            <button
              type="button"
              onClick={() => setEditandoConteudo(true)}
              className="text-xs text-primary-600 hover:underline"
            >
              {conteudoDado ? "Editar" : "Adicionar"}
            </button>
          )}
        </div>
        {editandoConteudo ? (
          <div className="space-y-2">
            <textarea
              value={conteudoDado}
              onChange={(e) => setConteudoDado(e.target.value)}
              rows={3}
              placeholder="Descreva o conteúdo abordado na aula..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setConteudoDado(aula?.conteudo_dado ?? ""); setEditandoConteudo(false); }}
                disabled={savingConteudo}
              >
                Cancelar
              </Button>
              <Button type="button" size="sm" loading={savingConteudo} onClick={handleSaveConteudo}>
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted whitespace-pre-wrap">{conteudoDado || "Nenhum conteúdo registrado."}</p>
        )}
      </div>

      <div className="space-y-2">
        {presencas.length === 0 && <p className="text-sm text-muted">Nenhum aluno matriculado nesta turma.</p>}
        {presencas.map((p) => {
          const temReposicaoPendente = reposicoesPendentes.some((r) => r.aluno_id === p.aluno_id && r.aula_origem_id === Number(id));
          return (
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
                {isAdmin && aulaIniciou && p.tipo === "matriculado" && !p.presente && !temReposicaoPendente && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={gerandoReposicao === p.aluno_id}
                    onClick={() => handleGerarReposicao(p.aluno_id)}
                    className="text-xs text-amber-600 hover:text-amber-700"
                  >
                    Gerar reposição
                  </Button>
                )}
                {temReposicaoPendente && (
                  <Badge variant="warning">Reposição pendente</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isAdmin && <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Adicionar participante</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <Combobox
              options={pessoaOptions}
              value={addAlunoId}
              onChange={setAddAlunoId}
              placeholder={addTipo === "substituto" ? "Buscar aluno com reposição pendente..." : "Buscar aluno..."}
            />
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
              Reposição {reposicaoOptions.length > 0 && <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1">{reposicaoOptions.length}</span>}
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

      <MateriaisSection
        aulaId={Number(id)}
        turmaId={aula?.turma_id ?? undefined}
      />
    </div>
  );
}
