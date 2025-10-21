from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from datetime import timedelta, time, datetime
from zoneinfo import ZoneInfo
from app.schemas.appointments import AppointmentCreate, AppointmentOut
from app.api.deps import get_db, get_current_user_id
from app.models.appointment import Appointment
from app.models.provider import ProviderWorkHours
from app.services.outbox import enqueue_event

router = APIRouter()
SLOT_MINUTES = 30

def _is_within_work_hours(db: Session, provider_id: str, starts_local: datetime) -> bool:
    weekday = starts_local.date().weekday()
    weekday_db = (weekday + 1) % 7  # convert Mon=0 -> our 0=Sun
    blocks = db.execute(select(ProviderWorkHours).where(ProviderWorkHours.provider_id==provider_id, ProviderWorkHours.weekday==weekday_db)).scalars().all()
    if not blocks:
        return False
    for b in blocks:
        b_start = datetime.combine(starts_local.date(), b.start_time, starts_local.tzinfo)
        b_end = datetime.combine(starts_local.date(), b.end_time, starts_local.tzinfo)
        if b_start <= starts_local < b_end and starts_local + timedelta(minutes=SLOT_MINUTES) <= b_end:
            return True
    return False

@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(payload: AppointmentCreate, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    tzinfo = ZoneInfo(payload.tz)
    starts_local = payload.starts_at_iso.astimezone(tzinfo)
    ends_local = starts_local + timedelta(minutes=SLOT_MINUTES)

    if starts_local <= datetime.now(tzinfo):
        raise HTTPException(status_code=400, detail="cannot book in the past")

    if not _is_within_work_hours(db, str(payload.provider_id), starts_local):
        raise HTTPException(status_code=400, detail="outside provider work hours")

    starts_utc = starts_local.astimezone(ZoneInfo("UTC"))
    ends_utc = ends_local.astimezone(ZoneInfo("UTC"))

    conflict = db.scalar(select(Appointment).where(
        and_(
            Appointment.provider_id==str(payload.provider_id),
            Appointment.starts_at==starts_utc,
            Appointment.status.in_(("PENDING","CONFIRMED"))
        )
    ))
    if conflict:
        raise HTTPException(status_code=409, detail="slot already taken")

    appt = Appointment(user_id=user_id, provider_id=str(payload.provider_id), starts_at=starts_utc, ends_at=ends_utc, status="PENDING")
    db.add(appt)
    db.flush()  # get appt.id
    enqueue_event(db, "Appointment", str(appt.id), "APPT_CREATED", {"provider_id": str(payload.provider_id), "starts_at": starts_utc.isoformat()})
    db.commit()
    db.refresh(appt)
    return {"id": appt.id, "status": appt.status}

@router.delete("/{appointment_id}")
def cancel_appointment(appointment_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    appt = db.scalar(select(Appointment).where(Appointment.id==appointment_id))
    if not appt:
        raise HTTPException(status_code=404, detail="not found")
    if str(appt.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail="forbidden")
    if appt.status == "CANCELED":
        return {"status": "CANCELED", "id": appointment_id}
    appt.status = "CANCELED"
    db.add(appt)
    enqueue_event(db, "Appointment", str(appt.id), "APPT_CANCELED", {"starts_at": appt.starts_at.isoformat()})
    db.commit()
    return {"status": "CANCELED", "id": appointment_id}

@router.get("", response_model=list[AppointmentOut])
def list_my_appointments(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    rows = db.execute(select(Appointment).where(Appointment.user_id==user_id).order_by(Appointment.starts_at.desc())).scalars().all()
    return [{"id": r.id, "status": r.status} for r in rows]
