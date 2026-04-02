from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_staff_or_professor
from app.models.avaliacao import STATUS_AVALIACAO
from app.models.user import User
from app.repositories import avaliacao as repo
from app.schemas.avaliacao import (
    AvaliacaoAlunoOut,
    AvaliacaoCreate,
    AvaliacaoListOut,
    AvaliacaoOut,
    AvaliacaoQuestaoIn,
    AvaliacaoUpdate,
    CorrecaoIn,
    RespostaAlunoOut,
)

router = APIRouter(prefix="/avaliacoes", tags=["avaliacoes"])


def _get_or_404(db: Session, avaliacao_id: int):
    av = repo.buscar(db, avaliacao_id)
    if not av:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    return av


def _professor_turma_ids(user: User, db: Session) -> list[int]:
    """Retorna IDs das turmas do professor logado."""
    from app.models.turma import Turma
    return [t.id for t in db.query(Turma).filter(Turma.professor_id == user.pessoa_id).all()]


def _check_professor_acesso(av, user: User, db: Session) -> None:
    """Lança 403 se professor tentar acessar avaliação de outra turma."""
    if user.role == "professor":
        ids = _professor_turma_ids(user, db)
        if av.turma_id not in ids:
            raise HTTPException(status_code=403, detail="Acesso negado")


def _enrich(av, db: Session) -> dict:
    from app.models.avaliacao import AvaliacaoAluno
    from app.models.aula import Aula as AulaModel
    total_alunos = db.query(AvaliacaoAluno).filter(AvaliacaoAluno.avaliacao_id == av.id).count()
    total_pendentes = db.query(AvaliacaoAluno).filter(
        AvaliacaoAluno.avaliacao_id == av.id,
        AvaliacaoAluno.status == "aguardando_correcao",
    ).count()
    turma_nome = av.turma.nome if av.turma else None
    aula_data = aula_hora_inicio = aula_hora_fim = None
    if av.aula_id:
        aula = db.query(AulaModel).filter(AulaModel.id == av.aula_id).first()
        if aula:
            aula_data = aula.data
            aula_hora_inicio = str(aula.hora_inicio)
            aula_hora_fim = str(aula.hora_fim)
    return {
        **{c.name: getattr(av, c.name) for c in av.__table__.columns},
        "turma_nome": turma_nome,
        "aula_data": aula_data,
        "aula_hora_inicio": aula_hora_inicio,
        "aula_hora_fim": aula_hora_fim,
        "questoes": av.questoes,
        "total_alunos": total_alunos,
        "total_pendentes": total_pendentes,
    }


@router.get("/", response_model=list[AvaliacaoListOut])
def listar(
    turma_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    topico: Optional[str] = Query(None),
    modulo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    from app.models.avaliacao import AvaliacaoAluno
    professor_turma_ids = _professor_turma_ids(current_user, db) if current_user.role == "professor" else None
    items, _total = repo.listar(
        db,
        turma_ids=professor_turma_ids,
        turma_id=turma_id if professor_turma_ids is None else None,
        status=status, topico=topico, modulo=modulo,
        skip=(page - 1) * page_size, limit=page_size,
    )
    result = []
    for av in items:
        total_alunos = db.query(AvaliacaoAluno).filter(AvaliacaoAluno.avaliacao_id == av.id).count()
        result.append(AvaliacaoListOut(
            id=av.id,
            titulo=av.titulo,
            topicos=av.topicos,
            modulo=av.modulo,
            turma_id=av.turma_id,
            turma_nome=av.turma.nome if av.turma else None,
            data_aplicacao=av.data_aplicacao,
            status=av.status,
            criado_em=av.criado_em,
            total_questoes=len(av.questoes),
            total_alunos=total_alunos,
        ))
    return result


@router.post("/", response_model=AvaliacaoOut, status_code=status.HTTP_201_CREATED)
def criar(
    dados: AvaliacaoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    if current_user.role == "professor":
        ids = _professor_turma_ids(current_user, db)
        if dados.turma_id not in ids:
            raise HTTPException(status_code=403, detail="Acesso negado")
    av = repo.criar(db, dados, criado_por_id=current_user.id)
    return AvaliacaoOut(**_enrich(av, db))


@router.get("/{avaliacao_id}", response_model=AvaliacaoOut)
def buscar(
    avaliacao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    av = _get_or_404(db, avaliacao_id)
    _check_professor_acesso(av, current_user, db)
    return AvaliacaoOut(**_enrich(av, db))


@router.patch("/{avaliacao_id}", response_model=AvaliacaoOut)
def atualizar(
    avaliacao_id: int,
    dados: AvaliacaoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    av = _get_or_404(db, avaliacao_id)
    _check_professor_acesso(av, current_user, db)
    av = repo.atualizar(db, av, dados)
    return AvaliacaoOut(**_enrich(av, db))


@router.delete("/{avaliacao_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar(
    avaliacao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    av = _get_or_404(db, avaliacao_id)
    _check_professor_acesso(av, current_user, db)
    repo.deletar(db, av)


@router.post("/{avaliacao_id}/publicar", response_model=AvaliacaoOut)
def publicar(
    avaliacao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    av = _get_or_404(db, avaliacao_id)
    _check_professor_acesso(av, current_user, db)
    if av.status != "rascunho":
        raise HTTPException(status_code=409, detail="Avaliação já foi publicada ou encerrada")
    if not av.questoes:
        raise HTTPException(status_code=422, detail="Adicione ao menos uma questão antes de publicar")
    av = repo.mudar_status(db, av, "publicada")
    return AvaliacaoOut(**_enrich(av, db))


@router.post("/{avaliacao_id}/encerrar", response_model=AvaliacaoOut)
def encerrar(
    avaliacao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    av = _get_or_404(db, avaliacao_id)
    _check_professor_acesso(av, current_user, db)
    if av.status != "publicada":
        raise HTTPException(status_code=409, detail="Só é possível encerrar avaliações publicadas")
    av = repo.mudar_status(db, av, "encerrada")
    return AvaliacaoOut(**_enrich(av, db))


@router.post("/{avaliacao_id}/questoes", response_model=AvaliacaoOut)
def adicionar_questao(
    avaliacao_id: int,
    item: AvaliacaoQuestaoIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    av = _get_or_404(db, avaliacao_id)
    _check_professor_acesso(av, current_user, db)
    if av.status != "rascunho":
        raise HTTPException(status_code=409, detail="Só é possível editar questões em rascunho")
    repo.adicionar_questao(db, avaliacao_id, item)
    db.refresh(av)
    return AvaliacaoOut(**_enrich(av, db))


@router.delete("/{avaliacao_id}/questoes/{questao_id}", response_model=AvaliacaoOut)
def remover_questao(
    avaliacao_id: int,
    questao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    av = _get_or_404(db, avaliacao_id)
    _check_professor_acesso(av, current_user, db)
    if av.status != "rascunho":
        raise HTTPException(status_code=409, detail="Só é possível editar questões em rascunho")
    repo.remover_questao(db, avaliacao_id, questao_id)
    db.refresh(av)
    return AvaliacaoOut(**_enrich(av, db))


@router.get("/{avaliacao_id}/alunos", response_model=list[AvaliacaoAlunoOut])
def listar_alunos(
    avaliacao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    av = _get_or_404(db, avaliacao_id)
    _check_professor_acesso(av, current_user, db)
    from app.models.avaliacao import AvaliacaoAluno
    from app.models.pessoa import Pessoa
    registros = (
        db.query(AvaliacaoAluno, Pessoa)
        .join(Pessoa, Pessoa.id == AvaliacaoAluno.aluno_id)
        .filter(AvaliacaoAluno.avaliacao_id == avaliacao_id)
        .order_by(AvaliacaoAluno.iniciado_em.desc())
        .all()
    )
    return [
        AvaliacaoAlunoOut(
            aluno_id=reg.aluno_id,
            nome=pessoa.nome,
            status=reg.status,
            nota_final=reg.nota_final,
            iniciado_em=reg.iniciado_em,
            concluido_em=reg.concluido_em,
        )
        for reg, pessoa in registros
    ]


@router.get("/{avaliacao_id}/respostas/{aluno_id}", response_model=list[RespostaAlunoOut])
def respostas_aluno(
    avaliacao_id: int,
    aluno_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    av = _get_or_404(db, avaliacao_id)
    _check_professor_acesso(av, current_user, db)
    peso_map = {aq.questao_id: aq.peso for aq in av.questoes}
    respostas = repo.buscar_respostas_aluno(db, avaliacao_id, aluno_id)
    result = []
    for r in respostas:
        result.append(RespostaAlunoOut(
            questao_id=r.questao_id,
            codigo=r.questao.codigo,
            enunciado=r.questao.enunciado,
            subtipo=r.questao.subtipo,
            peso=peso_map.get(r.questao_id, 1.0),
            resposta_dada=r.resposta_dada,
            acertou=r.acertou,
            nota_manual=r.nota_manual,
            comentario_professor=r.comentario_professor,
            corrigida=r.corrigida,
        ))
    return result


@router.patch("/{avaliacao_id}/corrigir/{aluno_id}/{questao_id}", response_model=RespostaAlunoOut)
def corrigir(
    avaliacao_id: int,
    aluno_id: int,
    questao_id: int,
    dados: CorrecaoIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    av = _get_or_404(db, avaliacao_id)
    _check_professor_acesso(av, current_user, db)
    peso_map = {aq.questao_id: aq.peso for aq in av.questoes}
    try:
        resp = repo.corrigir_resposta(db, avaliacao_id, aluno_id, questao_id, dados.nota_manual, dados.comentario_professor)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return RespostaAlunoOut(
        questao_id=resp.questao_id,
        codigo=resp.questao.codigo,
        enunciado=resp.questao.enunciado,
        subtipo=resp.questao.subtipo,
        peso=peso_map.get(resp.questao_id, 1.0),
        resposta_dada=resp.resposta_dada,
        acertou=resp.acertou,
        nota_manual=resp.nota_manual,
        comentario_professor=resp.comentario_professor,
        corrigida=resp.corrigida,
    )
