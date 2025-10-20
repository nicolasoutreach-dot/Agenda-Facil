# Agenda Fácil — Backend (Proposta de README)

> **Objetivo deste README**: ser *executável* em 5–10 minutos por qualquer dev — do clone ao primeiro agendamento criado em ambiente local — alinhado ao SPEC já definido.

---

## 1) Visão Rápida

API modular em TypeScript que fornece catálogo, agenda e notificações (WhatsApp + SMS) para profissionais de beleza. Foco em **agendamento impecável**, **simplicidade poderosa** e **consistência de dados** (PostgreSQL + constraints anti‑overbooking).

**Stack (MVP):** Node 20+, Express/Fastify, Prisma, PostgreSQL 15+ (PostGIS), Redis, Docker Compose.

---

## 2) Quickstart (local)

```bash
# Clonar..
git clone https://github.com/<org>/agenda-facil.git && cd agenda-facil

# Instalar deps (ajuste para npm/yarn/pnpm)
pnpm install

# Subir serviços básicos
docker compose up -d  # Postgres (com PostGIS) e Redis

# Configurar env.
cp .env.example .env  # revise chaves mínimas (DB/Redis)

# Gerar client e rodar migrations
pnpm prisma generate && pnpm prisma migrate dev

# Seed opcional
pnpm ts-node scripts/seed.ts

# Rodar API
pnpm dev
```

**Verificar**: `GET http://localhost:3000/health` → `200 OK`.

---

## 3) Pré‑requisitos

* **Node.js** 20+ (LTS ok)
* **Docker + Docker Compose**
* **pnpm** (ou npm/yarn)

> Dica: se `prisma` falhar com `P1001`, valide se o container do Postgres está saudável e se a `DATABASE_URL` bate com o `docker-compose.yml`.

---

> Após validarmos esta primeira parte (Visão/Quickstart/Pré‑reqs), adiciono as seções seguintes: *Configuração (.env.example)*, *Docker Compose*, *Scripts*, *Estrutura do Projeto*, *Endpoints*, *Contribuição* e *Roadmap* — todas em formato pronto para copiar/colar.

---

## 4) `.env.example`

> Copie para `.env` e ajuste valores.

```ini
# App
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000

# Banco/Cache
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agenda?schema=public
REDIS_URL=redis://localhost:6379

# Auth (JWT/OTP)
JWT_SECRET=change_me
OTP_TTL_SECONDS=300

# WhatsApp Cloud API
WA_PHONE_NUMBER_ID=
WA_ACCESS_TOKEN= 
WA_WABA_ID= 

# Zenvia SMS
ZENVIA_API_TOKEN= 
ZENVIA_SENDER_ID= 
```

---

## 5) Docker Compose (DB/Cache/API/Worker)

> Salve como `docker-compose.yml` na raiz.

```yaml
version: '3.9'
services:
  db:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 10
  cache:
    image: redis:7
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
  api:
    build: ./apps/api
    env_file: .env
    depends_on:
      db: { condition: service_healthy }
      cache: { condition: service_healthy }
    ports: ["3000:3000"]
  worker:
    build: ./packages/workers
    env_file: .env
    depends_on:
      db: { condition: service_healthy }
```

---

## 6) Fluxo de Autenticação Manual (Local)

> Pré-requisitos: Postgres rodando (`docker compose up -d db`), `.env` preenchido e `npm run prisma:migrate` executado dentro de `backend`.

1. **Inicie o backend**
   ```powershell
   cd backend
   npm run dev
   ```
   Aguarde o log `Server listening on port 4000`.

2. **Cadastrar usuário (PowerShell)**
   ```powershell
   $registerBody = @{
     name     = "Teste CLI"
     email    = "teste.cli@example.com"
     password = "segredo123"
   } | ConvertTo-Json

   Invoke-RestMethod -Method Post `
     -Uri "http://localhost:4000/api/v1/users/register" `
     -ContentType "application/json" `
     -Body $registerBody
   ```

3. **Fazer login e capturar tokens**
   ```powershell
   $loginBody = @{
     email    = "teste.cli@example.com"
     password = "segredo123"
   } | ConvertTo-Json

   $loginResponse = Invoke-RestMethod -Method Post `
     -Uri "http://localhost:4000/api/v1/users/login" `
     -ContentType "application/json" `
     -Body $loginBody

   $accessToken  = $loginResponse.token        # compatível com versões antigas
   $refreshToken = $loginResponse.refreshToken # novo fluxo
   ```

4. **Acessar dashboard autenticado**
   ```powershell
   Invoke-RestMethod -Method Get `
     -Uri "http://localhost:4000/api/v1/users/dashboard" `
     -Headers @{ Authorization = "Bearer $accessToken" }
   ```
   Resposta esperada: `Welcome back, teste.cli@example.com!`

5. **Renovar o access token**
   ```powershell
   $refreshResponse = Invoke-RestMethod -Method Post `
     -Uri "http://localhost:4000/api/v1/auth/refresh" `
     -ContentType "application/json" `
     -Body (@{ refreshToken = $refreshToken } | ConvertTo-Json)

   $accessToken  = $refreshResponse.token
   $refreshToken = $refreshResponse.refreshToken
   ```

6. **Recuperar senha (start da feature)**
   ```powershell
   $forgotBody = @{ email = "teste.cli@example.com" } | ConvertTo-Json
   $forgotResponse = Invoke-RestMethod -Method Post `
     -Uri "http://localhost:4000/api/v1/auth/forgot-password" `
     -ContentType "application/json" `
     -Body $forgotBody

   # Em ambiente de desenvolvimento/teste o token volta na resposta
   $resetBody = @{
     token    = $forgotResponse.resetToken
     password = "novaSenha123"
   } | ConvertTo-Json

   Invoke-RestMethod -Method Post `
     -Uri "http://localhost:4000/api/v1/auth/reset-password" `
     -ContentType "application/json" `
     -Body $resetBody
   ```
   Faça um novo login com a senha atualizada para validar o fluxo completo.

---

## 6) Scripts úteis (package.json)

```json
{
  "scripts": {
    "dev": "tsx apps/api/src/server.ts",
    "worker": "tsx packages/workers/src/outbox.ts",
    "build": "tsc -p .",
    "start": "node dist/apps/api/src/server.js",
    "migrate": "prisma migrate dev",
    "generate": "prisma generate",
    "lint": "eslint . --ext .ts",
    "test": "NODE_OPTIONS='--experimental-vm-modules' jest --config=jest.config.js",
    "seed": "tsx scripts/seed.ts"
  }
}
```

---

## 7) Estrutura de pastas (sugerida)

```text
/agenda-facil
  /apps
    /api
      /src
        /modules
          /identity
          /catalog
          /schedule
          /notifications
        /config (cors, rate-limit, swagger)
        /routes
        /controllers
        /services
        server.ts
    /web (PWA)
  /packages
    /db (schema.prisma, cliente Prisma)
    /workers (outbox worker)
  /scripts (seed.ts)
  docker-compose.yml
```

> **ESM:** use `"type": "module"` e **sempre** `.js` nos imports relativos compilados (ex.: `import { x } from './x.js'`).

---

## 8) Endpoints MVP (OpenAPI)

* `GET /health` → status do app.
* `GET /ready` → verifica DB/Redis.
* `POST /auth/request-otp` → envia OTP via WhatsApp (fallback SMS Zenvia).
* `POST /auth/verify-otp` → troca por JWT (access+refresh).
* `GET /catalog/providers?lat&lon&radius` → lista por raio.
* `GET /catalog/providers/:id/services` → serviços do prestador.
* `GET /schedule/providers/:id/availability?date&serviceId` → slots do dia.
* `POST /schedule/appointments` → cria agendamento (**Idempotency-Key** obrigatória).

**Swagger/OpenAPI**: habilite `/docs` com `swagger-ui-express` ou `fastify-swagger`.
    
---

## 9) Exemplo de Handlers (trechos)

**/ready**

```ts
app.get('/ready', async (_, reply) => {
  await db.$queryRaw`SELECT 1`;
  await redis.ping();
  return reply.send({ ok: true });
});
```

**POST /schedule/appointments** (concorrência)

```ts
app.post('/schedule/appointments', { preHandler: [idempotency()] }, async (req, reply) => {
  const { providerId, serviceId, startAt } = req.body;
  return db.$transaction(async (tx) => {
    const service = await tx.service.findUnique({ where: { id: serviceId } });
    const start = new Date(startAt);
    const end = new Date(start.getTime() + (service.duration_min + service.padding_min) * 60000);
    const appt = await tx.$queryRaw`INSERT INTO appointments
      (id, provider_id, customer_id, service_id, start_at, end_at, status)
      VALUES (gen_random_uuid(), ${providerId}::uuid, ${req.user.id}::uuid, ${serviceId}::uuid, ${start}, ${end}, 'confirmed')
      RETURNING *`;
    await tx.$executeRaw`INSERT INTO notification_outbox (event_type, payload)
      VALUES ('appointment_confirmed', ${JSON.stringify({ to: req.user.phone, appt })}::jsonb)`;
    return appt;
  }).then((r) => reply.send(r));
});
```

---

## 10) Worker de Notificações (WhatsApp + Zenvia)

```ts
while (true) {
  const rows = await db.$queryRaw`SELECT * FROM notification_outbox
    WHERE sent_at IS NULL AND next_attempt_at <= now()
    ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED`;
  for (const ev of rows) {
    const ok = await sendWhatsApp(ev).catch(() => false) || await sendZenvia(ev).catch(() => false);
    if (ok) await db.$executeRaw`UPDATE notification_outbox SET sent_at = now() WHERE id = ${ev.id}`;
    else await backoff(ev.id, ev.attempt_count + 1);
  }
  await delay(15000);
}
```

---

## 11) Teste de concorrência (manual)

```bash
# 20 requisições para o MESMO slot
for i in {1..20}; do \
  curl -s -o /dev/null -w "%{http_code}
" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: run-123-$i' \
  -d '{"providerId":"<PID>","serviceId":"<SID>","startAt":"2025-10-13T15:00:00-03:00"}' \
  http://localhost:3000/schedule/appointments &
done; wait
# Esperado: 1x 200 e ~19x 409 (no_overlap)
```

---

## 12) Lint/Format/CI

* **ESLint/Prettier/EditorConfig** configurados no root.
* **GitHub Actions** (exemplo `.github/workflows/ci.yml`):

```yaml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: corepack enable && pnpm -v
      - run: pnpm install --frozen-lockfile
      - run: pnpm generate && pnpm migrate
      - run: pnpm lint && pnpm test
      - run: pnpm build
```

---

## 13) Seed mínimo (`scripts/seed.ts`)

```ts
await db.user.upsert({
  where: { phone_e164: '+5511999999999' },
  update: {},
  create: { phone_e164: '+5511999999999', role: 'provider', name: 'Barbearia XPTO' }
});
// cria provider, serviço e working_hours de exemplo
```

---

## 14) Próximos passos

* Implementar cache de disponibilidade (Redis) + invalidações.
* Habilitar templates do WhatsApp e webhook de entrega Zenvia.
* Publicar `/docs` (Swagger) e completar exemplos de request/response.
