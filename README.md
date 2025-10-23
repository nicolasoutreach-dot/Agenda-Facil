Agenda Fácil

SaaS de agendamento e gestão para prestadores de serviço (salões, barbearias, clínicas, consultórios e autônomos). Focado em Simplicidade Poderosa, Inteligência Acionável e Ecossistema Aberto.

Visão Geral

A Agenda Fácil capacita o profissional/negócio a operar sua agenda, atender clientes, fechar caixa e crescer sem marketplace, fortalecendo a marca do cliente. Público-alvo: MEIs, autônomos e pequenos times que precisam de uma ferramenta direta, rápida e eficiente.

Proposta de valor (PVU):

Simplicidade Poderosa (fazer o essencial muito bem),

Inteligência Acionável (insights e recomendações, não só relatórios),

Ecossistema Aberto (integrações livres com pagamentos/contabilidade/marketing).

Escopo do MVP (Fase 1)

Essencial (Must):

Landing/Marketing com CTA “Criar conta”, prova social e FAQ.

Cadastro & Onboarding com OTP por e-mail/WhatsApp e coleta mínima (nome do negócio, serviços, horários, política de confirmação).

Painel do Profissional com Agenda (dia/semana), Clientes (CRM básico), Serviços & Duração, Regras de confirmação automática, Bloqueios, PDV básico e Notificações.

Link Público de Agendamento (mobile-first): escolher serviço → horários em tempo real → dados do cliente → confirmação; reagendar/cancelar via link único.

Página de Confirmação & Pós-reserva com “Adicionar ao calendário” e “Compartilhar no WhatsApp”.

Desejável no MVP (Should):

Central de Notificações (templates, horários, opt-in, logs).

Financeiro básico/PDV (fechamento do dia, formas de pagamento, exportação simples).

Suporte & Status (help center e status/uptime).

Estrutura de URLs (sugestão):

Público: agendafacil.com/{slug-negocio}

Painel: app.agendafacil.com/dashboard

Integrações: app.agendafacil.com/integrations

Status: status.agendafacil.com

Arquitetura & Pastas

Monorepo (sugerido):

/ (raiz)
├── backend/           # API FastAPI + DB + Jobs
└── frontend/          # App web (dashboard + link público) — (em construção)


Backend (estrutura existente):

backend/
├─ Dockerfile
├─ docker-compose.yml
├─ pyproject.toml
├─ requirements.txt
├─ .env.example
├─ alembic/
│  ├─ env.py
│  └─ versions/
├─ app/
│  ├─ main.py
│  ├─ api/              # auth, providers, availability, appointments
│  ├─ core/             # config, segurança (JWT/hash), refresh tokens
│  ├─ db/               # session/engine
│  ├─ models/           # tabelas
│  ├─ schemas/          # Pydantic
│  ├─ services/         # outbox
│  └─ workers/          # Celery (beat + worker)


Stack backend (MVP): Python 3.11, FastAPI, Pydantic, SQLAlchemy + Alembic, PostgreSQL 16 (Docker), Redis 7 (Docker), Celery (worker+beat), Uvicorn.

Como rodar o backend (Docker)

Execute na pasta backend/.

Copie o .env

cp .env.example .env


Suba os serviços (API, DB, Redis, Worker, Beat)

docker compose up -d --build


Aplique migrações

docker compose exec api alembic upgrade head


Verifique a API

Health: http://127.0.0.1:8000/healthz
 → {"status":"ok"}

Swagger: http://127.0.0.1:8000/docs

Portas: 8000 (API), 5432 (Postgres), 6379 (Redis).

Teste guiado (Swagger)

Signup — POST /auth/signup

{ "email": "dev@ex.com", "password": "Senha@123", "full_name": "Dev" }


Authorize (cadeado no topo): informe apenas o access_token.

Criar Provider — POST /providers

{ "display_name": "Dra. Ana" }


Work-hours — POST /providers/{provider_id}/work-hours

{ "weekday": 2, "start_time": "09:00", "end_time": "17:00" }


weekday: 0=domingo … 6=sábado.

Disponibilidade — GET /providers/{id}/availability?date=AAAA-MM-DD&tz=America/Sao_Paulo

Use data futura.

Criar agendamento — POST /appointments

{
  "provider_id": "SEU_PROVIDER_ID",
  "starts_at_iso": "2025-10-22T09:00:00-03:00",
  "tz": "America/Sao_Paulo"
}


Listar/Cancelar — GET /appointments / DELETE /appointments/{id}.

Notificações (Transactional Outbox)

Ao criar/cancelar appointments, eventos são gravados em outbox.

O Celery Beat executa outbox.relay (p.ex. a cada 10s), que move para notification_messages e chama notifications.send (stub).

Ver logs do worker: docker compose logs -f worker.

Pronto para acoplar canal real (WhatsApp/SMS) com retries/circuit breaker.

Roadmap (pós-MVP)

Painel de Inteligência (IA): churn prediction, upsell/cross-sell, otimização de horários com recomendações “um clique”.

Integrações & Pagamentos: Stripe, Pagar.me, PagSeguro; ERPs (Omie, ContaAzul, Nibo); Meta/Instagram “Agendar agora”; Google Meu Negócio.

Portal do Cliente (histórico, reagendar, avaliações) e Docs para Devs (API/SDKs/webhooks/versionamento).

Troubleshooting (rápido)

Swagger não abre / ERR_EMPTY_RESPONSE → docker compose ps, checar api em 0.0.0.0:8000, docker compose logs -n 100 api.

relation "users" does not exist → rodar migração: docker compose exec api alembic upgrade head.

email_validator ausente → adicione email-validator em requirements.txt e rebuild.

uvicorn não encontrado → rebuild sem cache e subir novamente.

Contribuição

Abra um issue descrevendo contexto e aceitação.

Faça fork/branch por área (ex.: feature/availability-slotting).

PR com descrição objetiva e checklist de testes manuais (Swagger).

Padronização: tipagem, Pydantic/SQLAlchemy 2.0, commit messages claras.

Licença
.
A definir.