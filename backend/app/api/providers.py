from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from uuid import UUID
from datetime import time
from app.api.deps import get_db, get_current_user_id
from app.schemas.providers import ProviderCreate, ProviderOut, WorkHourCreate, WorkHourOut
from app.models.provider import Provider, ProviderWorkHours

router = APIRouter()

@router.post("", response_model=ProviderOut, status_code=201)
def create_provider(payload: ProviderCreate, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    p = Provider(user_id=user_id, establishment_id=str(payload.establishment_id) if payload.establishment_id else None, display_name=payload.display_name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "display_name": p.display_name, "establishment_id": p.establishment_id}

@router.get("", response_model=list[ProviderOut])
def list_providers(db: Session = Depends(get_db)):
    rows = db.execute(select(Provider)).scalars().all()
    return [{"id": r.id, "display_name": r.display_name, "establishment_id": r.establishment_id} for r in rows]

@router.get("/{provider_id}", response_model=ProviderOut)
def get_provider(provider_id: UUID, db: Session = Depends(get_db)):
    p = db.get(Provider, provider_id)
    if not p:
        raise HTTPException(status_code=404, detail="not found")
    return {"id": p.id, "display_name": p.display_name, "establishment_id": p.establishment_id}

@router.patch("/{provider_id}", response_model=ProviderOut)
def update_provider(provider_id: UUID, payload: ProviderCreate, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    p = db.get(Provider, provider_id)
    if not p:
        raise HTTPException(status_code=404, detail="not found")
    if str(p.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail="forbidden")
    p.display_name = payload.display_name
    p.establishment_id = str(payload.establishment_id) if payload.establishment_id else None
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "display_name": p.display_name, "establishment_id": p.establishment_id}

# Work hours
@router.post("/{provider_id}/work-hours", response_model=WorkHourOut, status_code=201)
def add_work_hour(provider_id: UUID, payload: WorkHourCreate, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    p = db.get(Provider, provider_id)
    if not p:
        raise HTTPException(status_code=404, detail="provider not found")
    if str(p.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail="forbidden")
    try:
        st = time.fromisoformat(payload.start_time)
        et = time.fromisoformat(payload.end_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid time format")
    row = ProviderWorkHours(provider_id=str(provider_id), weekday=payload.weekday, start_time=st, end_time=et)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "weekday": row.weekday, "start_time": row.start_time.isoformat(timespec='minutes'), "end_time": row.end_time.isoformat(timespec='minutes')}

@router.get("/{provider_id}/work-hours", response_model=list[WorkHourOut])
def list_work_hours(provider_id: UUID, db: Session = Depends(get_db)):
    rows = db.execute(select(ProviderWorkHours).where(ProviderWorkHours.provider_id==str(provider_id))).scalars().all()
    return [{"id": r.id, "weekday": r.weekday, "start_time": r.start_time.isoformat(timespec='minutes'), "end_time": r.end_time.isoformat(timespec='minutes')} for r in rows]

@router.delete("/{provider_id}/work-hours/{row_id}")
def delete_work_hour(provider_id: UUID, row_id: int, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    p = db.get(Provider, provider_id)
    if not p:
        raise HTTPException(status_code=404, detail="provider not found")
    if str(p.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail="forbidden")
    row = db.get(ProviderWorkHours, row_id)
    if not row or str(row.provider_id) != str(provider_id):
        raise HTTPException(status_code=404, detail="not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
