import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.jobs import start_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
from app.routers import (
    auth,
    pessoas,
    users,
    niveis,
    professores,
    alunos,
    turmas,
    aulas,
    matriculas,
    presencas,
    reposicoes,
    contratos,
    materiais,
    questoes,
    avaliacoes,
    portal,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = start_scheduler()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="Ravilas English — API",
    description="Sistema de gestão para a escola de inglês Ravilas English",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
origins = settings.get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(pessoas.router)
app.include_router(users.router)
app.include_router(niveis.router)
app.include_router(professores.router)
app.include_router(alunos.router)
app.include_router(turmas.router)
app.include_router(aulas.router)
app.include_router(matriculas.router)
app.include_router(presencas.router)
app.include_router(reposicoes.router)
app.include_router(contratos.router)
app.include_router(materiais.router)
app.include_router(questoes.router)
app.include_router(avaliacoes.router)
app.include_router(portal.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "app": "Ravilas English API"}
