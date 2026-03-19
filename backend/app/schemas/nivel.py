from typing import Optional
from pydantic import BaseModel, ConfigDict


class NivelCreate(BaseModel):
    nome: str
    ordem: int = 0


class NivelUpdate(BaseModel):
    nome: Optional[str] = None
    ordem: Optional[int] = None
    ativo: Optional[bool] = None


class NivelOut(BaseModel):
    id: int
    nome: str
    ordem: int
    ativo: bool

    model_config = ConfigDict(from_attributes=True)
