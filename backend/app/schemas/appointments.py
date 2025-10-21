from pydantic import BaseModel, UUID4, AwareDatetime

class AppointmentCreate(BaseModel):
    provider_id: UUID4
    starts_at_iso: AwareDatetime
    tz: str

class AppointmentOut(BaseModel):
    id: UUID4
    status: str
