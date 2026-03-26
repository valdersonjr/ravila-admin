import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

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
    livros,
    professores,
    alunos,
    turmas,
    aulas,
    matriculas,
    presencas,
    reposicoes,
    contratos,
)

app = FastAPI(
    title="Ravilas English — API",
    description="Sistema de gestão para a escola de inglês Ravilas English",
    version="1.0.0",
)

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
app.include_router(livros.router)
app.include_router(professores.router)
app.include_router(alunos.router)
app.include_router(turmas.router)
app.include_router(aulas.router)
app.include_router(matriculas.router)
app.include_router(presencas.router)
app.include_router(reposicoes.router)
app.include_router(contratos.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "app": "Ravilas English API"}
