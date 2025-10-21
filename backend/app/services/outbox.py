from sqlalchemy.orm import Session
from app.models.outbox import Outbox

def enqueue_event(db: Session, aggregate_type: str, aggregate_id: str, event_type: str, payload: dict, headers: dict | None = None):
    row = Outbox(aggregate_type=aggregate_type, aggregate_id=aggregate_id, event_type=event_type, payload=payload, headers=headers or {})
    db.add(row)
    # do not commit here – caller controls transaction boundary
    return row
