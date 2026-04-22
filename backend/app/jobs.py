import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.aula import Aula
from app.constants import AulaStatus

logger = logging.getLogger(__name__)


def realizar_aulas_passadas() -> None:
    """Marca como 'realizada' toda aula 'agendada' cuja data/hora de fim já passou."""
    db: Session = SessionLocal()
    try:
        agora = datetime.now(ZoneInfo("America/Sao_Paulo")).replace(tzinfo=None)
        aulas = db.query(Aula).filter(Aula.status == AulaStatus.AGENDADA).all()
        atualizadas = 0
        for aula in aulas:
            hora_fim_dt = datetime.strptime(f"{aula.data} {aula.hora_fim}", "%Y-%m-%d %H:%M")
            if agora > hora_fim_dt:
                aula.status = AulaStatus.REALIZADA
                atualizadas += 1
        if atualizadas:
            db.commit()
        logger.info("jobs.realizar_aulas_passadas atualizadas=%d", atualizadas)
    except Exception:
        db.rollback()
        logger.exception("jobs.realizar_aulas_passadas erro")
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")
    scheduler.add_job(
        realizar_aulas_passadas,
        trigger=CronTrigger(hour=3, minute=0, timezone="America/Sao_Paulo"),
        id="realizar_aulas_passadas",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado — job 'realizar_aulas_passadas' agendado para 03:00")
    return scheduler
