from typing import Optional
from pydantic import BaseModel, ConfigDict


class LivroCreate(BaseModel):
    titulo: str
    serie: Optional[str] = None


class LivroUpdate(BaseModel):
    titulo: Optional[str] = None
    serie: Optional[str] = None
    ativo: Optional[bool] = None


class LivroOut(BaseModel):
    id: int
    titulo: str
    serie: Optional[str] = None
    ativo: bool

    model_config = ConfigDict(from_attributes=True)
