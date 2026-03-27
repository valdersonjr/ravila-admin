"use client";
import { useState } from "react";
import { professoresService } from "@/services/admin/professores";
import type { GerarSemanaRelatorio } from "@/services/admin/turmas";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type ModalState = "idle" | "checking" | "report" | "generating" | "done";

interface GerarSemanaModalProps {
  professorId: number;
  onGerado: () => void;
}

export function GerarSemanaModal({ professorId, onGerado }: GerarSemanaModalProps) {
  const [modalState, setModalState] = useState<ModalState>("idle");
  const [relatorio, setRelatorio] = useState<GerarSemanaRelatorio | null>(null);

  async function handleAbrir() {
    setModalState("checking");
    setRelatorio(null);
    const rel = await professoresService.gerarSemana(professorId, true);
    setRelatorio(rel);
    setModalState("report");
  }

  async function handleConfirmar() {
    setModalState("generating");
    const rel = await professoresService.gerarSemana(professorId, false);
    setRelatorio(rel);
    setModalState("done");
    onGerado();
  }

  function handleFechar() {
    setModalState("idle");
    setRelatorio(null);
  }

  const semanaLabel = relatorio
    ? `${new Date(relatorio.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")} – ${new Date(relatorio.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}`
    : "";

  return (
    <>
      <Button variant="outline" onClick={handleAbrir}>Gerar semana</Button>

      {modalState !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={modalState === "report" ? handleFechar : undefined} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border border-border p-6 shadow-xl space-y-4 max-h-[80vh] flex flex-col">
            {(modalState === "checking" || modalState === "generating") && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <span className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
                <p className="text-sm text-muted">{modalState === "checking" ? "Verificando semana..." : "Gerando aulas..."}</p>
              </div>
            )}
            {(modalState === "report" || modalState === "done") && relatorio && (() => {
              const totalConflitos = relatorio.itens.reduce((acc, i) => acc + i.conflitos.length, 0);
              const temConflito = totalConflitos > 0;
              const podeCriar = !temConflito && relatorio.total_aulas > 0;
              return (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{modalState === "done" ? "Aulas geradas" : "Pré-visualização"}</h2>
                    <p className="text-sm text-muted mt-0.5">{semanaLabel}</p>
                  </div>
                  {relatorio.itens.length === 0 && <p className="text-sm text-muted">Nenhuma turma ativa encontrada para este professor.</p>}
                  {relatorio.itens.length > 0 && relatorio.itens.every(i => i.sem_horario) && (
                    <p className="text-sm text-amber-600">Nenhuma turma possui horário cadastrado. Adicione horários às turmas para gerar aulas.</p>
                  )}
                  {temConflito && modalState === "report" && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                      <p className="text-sm font-medium text-red-700">Não é possível gerar a agenda da semana</p>
                      <p className="text-xs text-red-600 mt-1">O professor possui {totalConflitos} conflito(s) de horário. Resolva os conflitos antes de gerar as aulas.</p>
                    </div>
                  )}
                  <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                    {relatorio.itens.map((item) => (
                      <div key={item.turma_id} className="border border-border rounded-lg px-3 py-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{item.turma_nome}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.sem_horario && <Badge variant="warning">sem horário</Badge>}
                            {!item.sem_horario && item.aulas_a_criar > 0 && <Badge variant="success">{item.aulas_a_criar} aula(s)</Badge>}
                            {item.conflitos.length > 0 && <Badge variant="error">{item.conflitos.length} conflito(s)</Badge>}
                          </div>
                        </div>
                        {item.conflitos.map((c, i) => <p key={i} className="text-xs text-red-600">⚠ {c}</p>)}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 justify-end pt-2 border-t border-border">
                    <Button variant="ghost" onClick={handleFechar}>{modalState === "done" ? "Fechar" : "Cancelar"}</Button>
                    {modalState === "report" && podeCriar && (
                      <Button onClick={handleConfirmar}>Confirmar e gerar {relatorio.total_aulas} aula(s)</Button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
