from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from .celery_app import celery
from app.db.session import SessionLocal
from app.models.outbox import Outbox
from app.models.notification_message import NotificationMessage

def _utcnow():
    return datetime.now(timezone.utc)

@celery.task(name="outbox.relay")
def relay_outbox(batch_size: int = 50):
    db: Session = SessionLocal()
    try:
        rows = db.execute(
            select(Outbox).where(Outbox.published_at.is_(None)).order_by(Outbox.created_at).limit(batch_size)
        ).scalars().all()
        for ev in rows:
            # Business mapping: APPT_CREATED -> enqueue confirmation notification (stub channel 'whatsapp')
            if ev.event_type in ("APPT_CREATED", "APPT_CANCELED"):
                # For MVP: recipient is unknown, use placeholder; in real impl, join user contact
                msg = NotificationMessage(
                    channel="whatsapp",
                    recipient="+5500000000000",
                    template=ev.event_type.lower(),
                    variables=ev.payload,
                    status="QUEUED",
                    appointment_id=ev.aggregate_id,
                )
                db.add(msg)
                db.flush()
                send_notification.delay(msg.id)  # fire-and-forget
            ev.published_at = _utcnow()
            db.add(ev)
        if rows:
            db.commit()
    finally:
        db.close()

@celery.task(name="notifications.send", max_retries=3, default_retry_delay=5)
def send_notification(message_id: int):
    db: Session = SessionLocal()
    try:
        msg = db.get(NotificationMessage, message_id)
        if not msg:
            return {"skipped": True}
        try:
            # Stub "sender" – integrate with provider API here (WhatsApp/SMS)
            print(f"[send] channel={msg.channel} to={msg.recipient} template={msg.template} vars={msg.variables}")
            msg.status = "SENT"
            msg.sent_at = _utcnow()
            db.add(msg)
            db.commit()
            return {"ok": True, "id": message_id}
        except Exception as e:
            msg.status = "FAILED"
            msg.attempts = (msg.attempts or 0) + 1
            msg.last_error = str(e)
            db.add(msg)
            db.commit()
            raise send_notification.retry(exc=e)
    finally:
        db.close()
