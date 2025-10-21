from pydantic import BaseModel, UUID4, Field
from typing import Optional

class ProviderCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=140)
    establishment_id: Optional[UUID4] = None

class ProviderOut(BaseModel):
    id: UUID4
    display_name: str
    establishment_id: Optional[UUID4] = None

class WorkHourCreate(BaseModel):
    weekday: int  # 0=domingo .. 6=sábado
    start_time: str  # 'HH:MM'
    end_time: str    # 'HH:MM'

class WorkHourOut(BaseModel):
    id: int
    weekday: int
    start_time: str
    end_time: str
