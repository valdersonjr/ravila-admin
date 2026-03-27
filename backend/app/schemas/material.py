from datetime import datetime
from typing import Optional

from pydantic import BaseModel, model_validator

TIPOS_VALIDOS = {"pdf", "link", "video", "imagem"}
CATEGORIAS_VALIDAS = {"exercicio", "gramatica", "vocabulario", "pronuncia", "outro"}


class MaterialCreate(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    tipo: str = "pdf"
    categoria: str = "outro"
    url_externa: Optional[str] = None
    aula_id: Optional[int] = None
    turma_id: Optional[int] = None
    publico: bool = False

    @model_validator(mode="after")
    def validar(self):
        if self.tipo not in TIPOS_VALIDOS:
            raise ValueError(f"tipo deve ser um de: {TIPOS_VALIDOS}")
        if self.categoria not in CATEGORIAS_VALIDAS:
            raise ValueError(f"categoria deve ser um de: {CATEGORIAS_VALIDAS}")
        if self.tipo == "link" and not self.url_externa:
            raise ValueError("url_externa é obrigatória quando tipo='link'")
        return self


class MaterialUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    url_externa: Optional[str] = None
    aula_id: Optional[int] = None
    turma_id: Optional[int] = None
    publico: Optional[bool] = None


class MaterialOut(BaseModel):
    id: int
    titulo: str
    descricao: Optional[str]
    tipo: str
    categoria: str
    s3_key: Optional[str]
    url_externa: Optional[str]
    aula_id: Optional[int]
    turma_id: Optional[int]
    turma_nome: Optional[str]
    publico: bool
    criado_por_id: int
    criado_em: datetime
    tem_arquivo: bool

    model_config = {"from_attributes": True}


class MaterialPortalOut(BaseModel):
    """Schema reduzido para o portal do aluno — sem dados internos."""
    id: int
    titulo: str
    descricao: Optional[str]
    tipo: str
    categoria: str
    aula_id: Optional[int]
    tem_arquivo: bool
