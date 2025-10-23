from celery.schedules import crontab

from celery import Celery
import os

broker = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

celery = Celery("mvp", broker=broker, backend=backend)
celery.autodiscover_tasks(["app.workers.tasks"])

celery.conf.beat_schedule.update({
    # já deve existir sua task outbox.relay
    "requeue-stuck-every-60s": {
        "task": "notifications.requeue_stuck",
        "schedule": 60.0,

     },
})