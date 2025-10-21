from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo
from app.api.deps import get_db
from app.models.provider import ProviderWorkHours
from app.models.appointment import Appointment

router = APIRouter()

SLOT_MINUTES = 30

@router.get("/{provider_id}/availability")
def get_availability(provider_id: str, date: str, tz: str = "America/Sao_Paulo", db: Session = Depends(get_db)):
    # Parse date & tz
    try:
        day = datetime.fromisoformat(date).date()  # YYYY-MM-DD
        tzinfo = ZoneInfo(tz)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid date or tz")

    weekday = day.weekday()  # Monday=0 ... Sunday=6; our table uses 0..6 with 0=Sunday, adapt:
    # Convert to our convention (0=Sunday) -> Python Mon=0 => Sunday=6
    weekday_db = (weekday + 1) % 7

    # Work hours blocks
    blocks = db.execute(select(ProviderWorkHours).where(ProviderWorkHours.provider_id == provider_id, ProviderWorkHours.weekday == weekday_db)).scalars().all()
    if not blocks:
        return []

    # Build candidate slots in local tz
    def generate_slots(start_t: time, end_t: time):
        start_dt_local = datetime.combine(day, start_t, tzinfo)
        end_dt_local = datetime.combine(day, end_t, tzinfo)
        cur = start_dt_local
        while cur + timedelta(minutes=SLOT_MINUTES) <= end_dt_local:
            yield cur
            cur += timedelta(minutes=SLOT_MINUTES)

    candidate_local = []
    for b in blocks:
        candidate_local.extend(list(generate_slots(b.start_time, b.end_time)))

    if not candidate_local:
        return []

    # Fetch taken slots for that provider/day (consider PENDING & CONFIRMED)
    day_start_utc = datetime.combine(day, time(0,0,tzinfo=tzinfo)).astimezone(ZoneInfo("UTC"))
    day_end_utc = (day_start_utc + timedelta(days=1))

    taken = db.execute(
        select(Appointment.starts_at).where(
            and_(
                Appointment.provider_id == provider_id,
                Appointment.status.in_(("PENDING","CONFIRMED")),
                Appointment.starts_at >= day_start_utc,
                Appointment.starts_at < day_end_utc,
            )
        )
    ).scalars().all()
    taken_set = set(taken)

    # Filter out taken and past slots
    now_local = datetime.now(tzinfo)
    available_local = []
    for s in candidate_local:
        s_utc = s.astimezone(ZoneInfo("UTC"))
        if s_utc in taken_set:
            continue
        if s <= now_local:
            continue
        available_local.append(s)

    # Return ISO strings in requested tz
    return [s.isoformat() for s in sorted(available_local)]
