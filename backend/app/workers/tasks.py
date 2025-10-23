from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_, text
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential_jitter, retry_if_exception_type
import httpx
import pybreaker

from .celery_app import celery
from app.db.session import SessionLocal
from app.core.config import Settings
from app.models.outbox import Outbox
from app.models.notification_message import NotificationMessage
from app.models.appointment import Appointment  # noqa: F401  -> registra a tabela 'appointments'

settings = Settings()

class NotificationClient:
    def __init__(self, base_url: str, api_key: str):
        self._client = httpx.Client(
            base_url=base_url,
            timeout=httpx.Timeout(connect=2.0, read=5.0, write=5.0, pool=5.0),
        )
        self._api_key = api_key

    def close(self):
        self._client.close()

# Circuit Breaker em memória
_breaker = pybreaker.CircuitBreaker(
    fail_max=settings.notif_circuit_fail_max,
    reset_timeout=settings.notif_circuit_reset_seconds,
    name="notifications-http",
)

# Chamada protegida pelo breaker
def _send_whatsapp(client: "NotificationClient", to: str, template: str, variables: dict) -> dict:
    payload = {"to": to, "template": template, "variables": variables}
    headers = {"Authorization": f"Bearer {client._api_key}", "Content-Type": "application/json"}
    # Deixa o breaker decidir abrir/fechar com base nas exceções
    @_breaker
    def _do():
        resp = client._client.post("/whatsapp/send", json=payload, headers=headers)
        if 200 <= resp.status_code < 300:
            return resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"ok": True}
        if resp.status_code == 429 or 500 <= resp.status_code < 600:
            raise httpx.HTTPStatusError(f"Upstream error {resp.status_code}", request=resp.request, response=resp)
        raise ValueError(f"Provider rejected ({resp.status_code}): {resp.text}")
    return _do()

def get_notification_client() -> "NotificationClient":
    return NotificationClient(
        base_url=settings.notif_http_base_url,
        api_key=settings.notif_http_api_key,
    )

def _utcnow():
    return datetime.now(timezone.utc)

@celery.task(name="outbox.relay")
def relay_outbox(batch_size: int = 50):
    db: Session = SessionLocal()
    try:
        rows = db.execute(
            select(Outbox)
            .where(Outbox.published_at.is_(None))
            .order_by(Outbox.created_at)
            .limit(batch_size)
        ).scalars().all()

        to_send: list[int] = []

        for ev in rows:
            if ev.event_type in ("APPT_CREATED", "APPT_CANCELED"):
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
                to_send.append(msg.id)

            ev.published_at = _utcnow()
            db.add(ev)

        if rows:
            db.commit()
            for mid in to_send:
                send_notification.apply_async((mid,), countdown=1)

    finally:
        db.close()

# --- envio com retry exponencial (tenacity) ---

@retry(
    stop=stop_after_attempt(lambda: settings.notif_retry_max_attempts),
    wait=wait_exponential_jitter(
        initial=settings.notif_retry_backoff_base,
        max=settings.notif_retry_backoff_max
    ),
    reraise=True,
    retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError, pybreaker.CircuitBreakerError))
)
def _send_once_with_retry(to: str, template: str, variables: dict) -> dict:
    client = get_notification_client()
    try:
        return client.send_whatsapp(to=to, template=template, variables=variables)
    finally:
        client.close()

@celery.task(name="notifications.send", bind=True, max_retries=10, default_retry_delay=30)
def send_notification(self, message_id: int):
    db: Session = SessionLocal()
    try:
        msg = db.get(NotificationMessage, message_id)
        if not msg:
            # pode ser corrida de visibilidade
            raise self.retry(countdown=2)

        # tenta enviar (tenacity lida com retentativas/backoff)
        try:
            resp = _send_once_with_retry(msg.recipient, msg.template, msg.variables or {})
            # sucesso
            msg.status = "SENT"
            msg.sent_at = _utcnow()
            msg.attempts = (msg.attempts or 0) + 1
            msg.last_error = None
            db.add(msg)
            db.commit()
            print(f"[send] channel={msg.channel} to={msg.recipient} template={msg.template} vars={msg.variables} result={resp}")
            return {"ok": True, "id": message_id}

        except pybreaker.CircuitBreakerError as e:
            # circuito aberto — reagendar para depois do reset_timeout
            msg.status = "QUEUED"
            msg.attempts = (msg.attempts or 0) + 1
            msg.last_error = f"circuit-open: {str(e)}"
            db.add(msg)
            db.commit()
            raise self.retry(countdown=settings.notif_circuit_reset_seconds)

        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            # esgotou as tentativas (tenacity reraise) — marca FAILED e requeue via scheduler
            msg.status = "FAILED"
            msg.attempts = (msg.attempts or 0) + 1
            msg.last_error = str(e)
            db.add(msg)
            db.commit()
            # deixa o requeue periódico decidir próxima tentativa
            return {"failed": True, "id": message_id}

        except Exception as e:
            # falha inesperada — usa retry do Celery
            msg.status = "FAILED"
            msg.attempts = (msg.attempts or 0) + 1
            msg.last_error = f"unexpected: {str(e)}"
            db.add(msg)
            db.commit()
            raise self.retry(exc=e, countdown=30)

    finally:
        db.close()

# --- reprocessador periódico (DLQ light) ---

@celery.task(name="notifications.requeue_stuck")
def requeue_stuck():
    """
    Re-enfileira mensagens paradas:
      - QUEUED há mais que notif_requeue_stale_seconds
      - FAILED com tentativas < notif_failed_max_attempts
    """
    db: Session = SessionLocal()
    try:
        now = _utcnow()
        stale_cut = now - timedelta(seconds=settings.notif_requeue_stale_seconds)

        # QUEUED antigas
        queued_ids = db.execute(
            select(NotificationMessage.id)
            .where(and_(
                NotificationMessage.status == "QUEUED",
                NotificationMessage.created_at < stale_cut
            ))
            .order_by(NotificationMessage.id.desc())
            .limit(200)
        ).scalars().all()

        # FAILED com attempts < limite (espalhar em ondas)
        failed_ids = db.execute(
            select(NotificationMessage.id)
            .where(and_(
                NotificationMessage.status == "FAILED",
                (NotificationMessage.attempts.is_(None)) | (NotificationMessage.attempts < settings.notif_failed_max_attempts)
            ))
            .order_by(NotificationMessage.id.desc())
            .limit(200)
        ).scalars().all()

        for mid in queued_ids + failed_ids:
            send_notification.apply_async((mid,), countdown=1)

        return {"requeued": len(queued_ids) + len(failed_ids)}
    finally:
        db.close()
