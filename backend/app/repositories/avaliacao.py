from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.avaliacao import Avaliacao, AvaliacaoQuestao, AvaliacaoResposta, AvaliacaoAluno
from app.models.questao import Questao, SUBTIPOS_MANUAL
from app.schemas.avaliacao import AvaliacaoCreate, AvaliacaoUpdate, AvaliacaoQuestaoIn


# ── Admin CRUD ────────────────────────────────────────────────────────────────

def listar(
    db: Session,
    *,
    turma_ids: Optional[list[int]] = None,
    turma_id: Optional[int] = None,
    professor_id: Optional[int] = None,
    status: Optional[str] = None,
    topico: Optional[str] = None,
    modulo: Optional[str] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Avaliacao], int]:
    from app.models.turma import Turma
    q = db.query(Avaliacao).filter(Avaliacao.deletado == False)
    if turma_ids is not None:
        q = q.filter(Avaliacao.turma_id.in_(turma_ids))
    elif turma_id:
        q = q.filter(Avaliacao.turma_id == turma_id)
    if professor_id:
        q = q.join(Turma, Turma.id == Avaliacao.turma_id).filter(Turma.professor_id == professor_id)
    if status:
        q = q.filter(Avaliacao.status == status)
    if topico:
        q = q.filter(Avaliacao.topicos.any(topico))
    if modulo:
        q = q.filter(Avaliacao.modulo == modulo)
    if data_inicio:
        q = q.filter(Avaliacao.data_aplicacao >= data_inicio)
    if data_fim:
        q = q.filter(Avaliacao.data_aplicacao <= data_fim)
    q = q.order_by(Avaliacao.criado_em.desc())
    total = q.count()
    return q.offset(skip).limit(limit).all(), total


def buscar(db: Session, avaliacao_id: int) -> Optional[Avaliacao]:
    return db.query(Avaliacao).filter(Avaliacao.id == avaliacao_id, Avaliacao.deletado == False).first()


def deletar(db: Session, av: Avaliacao) -> None:
    av.deletado = True
    db.commit()


def criar(db: Session, dados: AvaliacaoCreate, criado_por_id: Optional[int] = None) -> Avaliacao:
    av = Avaliacao(
        titulo=dados.titulo,
        topicos=dados.topicos,
        modulo=dados.modulo,
        descricao=dados.descricao,
        tipo=dados.tipo,
        turma_id=dados.turma_id,
        aula_id=dados.aula_id,
        data_aplicacao=dados.data_aplicacao,
        hora_inicio=dados.hora_inicio,
        hora_fim=dados.hora_fim,
        criado_por_id=criado_por_id,
    )
    db.add(av)
    db.flush()  # gera id

    for i, q in enumerate(dados.questoes):
        db.add(AvaliacaoQuestao(
            avaliacao_id=av.id,
            questao_id=q.questao_id,
            ordem=q.ordem if q.ordem else i,
            peso=q.peso,
        ))

    db.commit()
    db.refresh(av)
    return av


def atualizar(db: Session, av: Avaliacao, dados: AvaliacaoUpdate) -> Avaliacao:
    for field, value in dados.model_dump(exclude_unset=True).items():
        setattr(av, field, value)
    db.commit()
    db.refresh(av)
    return av


def mudar_status(db: Session, av: Avaliacao, status: str) -> Avaliacao:
    av.status = status
    db.commit()
    db.refresh(av)
    return av


def adicionar_questao(db: Session, avaliacao_id: int, item: AvaliacaoQuestaoIn) -> AvaliacaoQuestao:
    aq = AvaliacaoQuestao(
        avaliacao_id=avaliacao_id,
        questao_id=item.questao_id,
        ordem=item.ordem,
        peso=item.peso,
    )
    db.add(aq)
    db.commit()
    db.refresh(aq)
    return aq


def remover_questao(db: Session, avaliacao_id: int, questao_id: int) -> None:
    db.query(AvaliacaoQuestao).filter(
        AvaliacaoQuestao.avaliacao_id == avaliacao_id,
        AvaliacaoQuestao.questao_id == questao_id,
    ).delete()
    db.commit()


def buscar_respostas_aluno(
    db: Session, avaliacao_id: int, aluno_id: int,
) -> list[AvaliacaoResposta]:
    return (
        db.query(AvaliacaoResposta)
        .filter(AvaliacaoResposta.avaliacao_id == avaliacao_id, AvaliacaoResposta.aluno_id == aluno_id)
        .all()
    )


def corrigir_resposta(
    db: Session,
    avaliacao_id: int,
    aluno_id: int,
    questao_id: int,
    nota_manual: float,
    comentario: Optional[str],
) -> AvaliacaoResposta:
    resp = (
        db.query(AvaliacaoResposta)
        .filter(
            AvaliacaoResposta.avaliacao_id == avaliacao_id,
            AvaliacaoResposta.aluno_id == aluno_id,
            AvaliacaoResposta.questao_id == questao_id,
        )
        .first()
    )
    if not resp:
        raise ValueError("Resposta não encontrada")
    resp.nota_manual = nota_manual
    resp.comentario_professor = comentario
    resp.corrigida = True
    db.commit()
    db.refresh(resp)
    _tentar_finalizar(db, avaliacao_id, aluno_id)
    return resp


def _tentar_finalizar(db: Session, avaliacao_id: int, aluno_id: int) -> None:
    """Calcula nota_final e marca concluida se todas as respostas estiverem corrigidas."""
    av = buscar(db, avaliacao_id)
    if not av:
        return

    peso_map = {aq.questao_id: aq.peso for aq in av.questoes}
    respostas = buscar_respostas_aluno(db, avaliacao_id, aluno_id)

    for r in respostas:
        q = db.query(Questao).filter(Questao.id == r.questao_id).first()
        if q and q.subtipo in SUBTIPOS_MANUAL and not r.corrigida:
            return  # ainda há pendências

    total_peso = sum(peso_map.values())
    pontos = 0.0
    for r in respostas:
        peso = peso_map.get(r.questao_id, 1.0)
        if r.acertou is True:
            pontos += peso
        elif r.nota_manual is not None:
            pontos += r.nota_manual * peso

    nota_final = round((pontos / total_peso) * 100, 1) if total_peso > 0 else 0.0

    reg = (
        db.query(AvaliacaoAluno)
        .filter(AvaliacaoAluno.avaliacao_id == avaliacao_id, AvaliacaoAluno.aluno_id == aluno_id)
        .first()
    )
    if reg:
        reg.status = "concluida"
        reg.nota_final = nota_final
        reg.concluido_em = datetime.now(timezone.utc)
        db.commit()


# ── Portal ────────────────────────────────────────────────────────────────────

def listar_para_aluno(db: Session, turma_id: int, aluno_id: int) -> list[dict]:
    avaliacoes = (
        db.query(Avaliacao)
        .filter(
            Avaliacao.turma_id == turma_id,
            Avaliacao.status.in_(["publicada", "encerrada"]),
            Avaliacao.deletado == False,
        )
        .order_by(Avaliacao.data_aplicacao.desc().nullslast(), Avaliacao.criado_em.desc())
        .all()
    )

    av_ids = [av.id for av in avaliacoes]
    regs: dict[int, AvaliacaoAluno] = {
        r.avaliacao_id: r
        for r in db.query(AvaliacaoAluno)
        .filter(AvaliacaoAluno.avaliacao_id.in_(av_ids), AvaliacaoAluno.aluno_id == aluno_id)
        .all()
    } if av_ids else {}

    result = []
    for av in avaliacoes:
        reg = regs.get(av.id)
        result.append({
            "av": av,
            "status_aluno": reg.status if reg else None,
            "nota_final": reg.nota_final if reg else None,
            "total_questoes": len(av.questoes),
        })
    return result


def aluno_ja_respondeu(db: Session, avaliacao_id: int, aluno_id: int) -> bool:
    return (
        db.query(AvaliacaoAluno)
        .filter(AvaliacaoAluno.avaliacao_id == avaliacao_id, AvaliacaoAluno.aluno_id == aluno_id)
        .first()
    ) is not None


def submeter_respostas(
    db: Session,
    av: Avaliacao,
    aluno_id: int,
    respostas: list[dict],  # [{questao_id, resposta_dada}]
) -> AvaliacaoAluno:
    from app.services.questao import verificar_resposta

    peso_map = {aq.questao_id: aq.peso for aq in av.questoes}
    tem_manual = False

    for item in respostas:
        q = db.query(Questao).filter(Questao.id == item["questao_id"]).first()
        if not q:
            continue

        if q.subtipo in SUBTIPOS_MANUAL:
            tem_manual = True
            db.add(AvaliacaoResposta(
                avaliacao_id=av.id,
                aluno_id=aluno_id,
                questao_id=item["questao_id"],
                resposta_dada=item["resposta_dada"],
                acertou=None,
                corrigida=False,
            ))
        else:
            acertou = verificar_resposta(q, item["resposta_dada"])
            db.add(AvaliacaoResposta(
                avaliacao_id=av.id,
                aluno_id=aluno_id,
                questao_id=item["questao_id"],
                resposta_dada=item["resposta_dada"],
                acertou=acertou,
                corrigida=True,
            ))

    status = "aguardando_correcao" if tem_manual else "concluida"
    reg = AvaliacaoAluno(
        avaliacao_id=av.id,
        aluno_id=aluno_id,
        status=status,
        concluido_em=datetime.now(timezone.utc),
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)

    if not tem_manual:
        _tentar_finalizar(db, av.id, aluno_id)
        db.refresh(reg)

    return reg


def lancar_notas_offline(db: Session, avaliacao_id: int, notas: list[dict]) -> None:
    """Upsert AvaliacaoAluno records com nota_final para avaliações offline."""
    for item in notas:
        aluno_id = item["aluno_id"]
        nota = item["nota"]
        reg = (
            db.query(AvaliacaoAluno)
            .filter(AvaliacaoAluno.avaliacao_id == avaliacao_id, AvaliacaoAluno.aluno_id == aluno_id)
            .first()
        )
        if nota is None:
            if reg:
                db.delete(reg)
        elif reg:
            reg.nota_final = nota
            reg.status = "concluida"
            reg.concluido_em = datetime.now(timezone.utc)
        else:
            db.add(AvaliacaoAluno(
                avaliacao_id=avaliacao_id,
                aluno_id=aluno_id,
                nota_final=nota,
                status="concluida",
                concluido_em=datetime.now(timezone.utc),
            ))
    db.commit()


def listar_por_aluno(db: Session, aluno_id: int) -> list[dict]:
    """Returns avaliacoes where the aluno participated, with their nota_final."""
    registros = (
        db.query(Avaliacao, AvaliacaoAluno)
        .join(AvaliacaoAluno, AvaliacaoAluno.avaliacao_id == Avaliacao.id)
        .filter(AvaliacaoAluno.aluno_id == aluno_id, Avaliacao.deletado == False)
        .order_by(Avaliacao.data_aplicacao.desc().nullslast(), Avaliacao.criado_em.desc())
        .all()
    )
    return [
        {
            "avaliacao": av,
            "status_aluno": reg.status,
            "nota_final": reg.nota_final,
            "total_questoes": len(av.questoes),
        }
        for av, reg in registros
    ]


def buscar_registro_aluno(db: Session, avaliacao_id: int, aluno_id: int) -> Optional[AvaliacaoAluno]:
    return (
        db.query(AvaliacaoAluno)
        .filter(AvaliacaoAluno.avaliacao_id == avaliacao_id, AvaliacaoAluno.aluno_id == aluno_id)
        .first()
    )
