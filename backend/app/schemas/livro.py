from typing import Optional
from pydantic import BaseModel, ConfigDict


class LivroCreate(BaseModel):
    titulo: str
    serie: Optional[str] = None
    ordem: int = 0


class LivroUpdate(BaseModel):
    titulo: Optional[str] = None
    serie: Optional[str] = None
    ordem: Optional[int] = None
    ativo: Optional[bool] = None


class LivroOut(BaseModel):
    id: int
    titulo: str
    serie: Optional[str] = None
    ordem: int
    ativo: bool

    model_config = ConfigDict(from_attributes=True)
