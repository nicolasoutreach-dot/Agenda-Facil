# MVP Backend – Fase 1

Minimal FastAPI + SQLAlchemy + Celery skeleton to cover:
- Users (signup/login JWT)
- Availability (simple slots)
- Appointments (create/cancel/list)
- Notifications outbox (skeleton)
- Health/readiness

## Quick start (Dev)
```bash
# 1) copy .env.example to .env and adjust
cp .env.example .env

# 2) start services
docker compose up -d --build

# 3) run DB migrations
docker compose exec api alembic upgrade head

# 4) open API docs
# http://localhost:8000/docs
```


## New endpoints
- **Providers**
  - `POST /providers` (auth) – cria provider do usuário
  - `GET /providers` – lista providers
  - `GET /providers/{id}` – obtém provider
  - `PATCH /providers/{id}` (auth, dono) – atualiza
  - `POST /providers/{id}/work-hours` (auth, dono) – adiciona bloco
  - `GET /providers/{id}/work-hours` – lista blocos
  - `DELETE /providers/{id}/work-hours/{row_id}` (auth, dono) – remove bloco

- **Auth refresh**
  - `POST /auth/refresh` – rota de rotação (refresh rotativo)
  - `POST /auth/logout` – revoga refresh atual


## Notifications via Transactional Outbox (MVP)
- `APPT_CREATED` / `APPT_CANCELED` são gravados na tabela **outbox** na mesma transação do agendamento.
- **Celery Beat** chama periodicamente `outbox.relay`, que lê eventos não publicados e cria **notification_messages** (status `QUEUED`), chamando a task `notifications.send`.
- A task `notifications.send` (stub) marca `SENT` ou `FAILED` com retries.

