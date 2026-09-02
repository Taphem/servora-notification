# Servora Notification

Standalone notification-delivery service for [Servora](https://servora.hemandu.com), an
AI-powered local service marketplace. This is the only Servora service that sends transactional
email and SMS.

## Repository independence

`servora-notification` is a completely standalone, independently deployable repository. It does
not share source code with, import from, or depend on any other Servora repository at build or
run time. It has its own `package.json`, dependencies, environment configuration, tests, and
Docker setup. Everything here can be built, linted, tested, and run with only this repository
checked out — no other Servora service needs to be running, and no paid third-party account
(Resend) is required for local development (see "Console development mode").

## What this service does

- Sends the **email verification** message for a newly registered account.
- Sends the **password reset** message for a reset request.
- Sends the **phone OTP** SMS for phone verification.
- Owns email/SMS provider integration (Resend for email; a console/dev SMS provider for now),
  templates, delivery logging, and internal-request validation.

## What this service does NOT do

Per `servora-docs/02-architecture/service-boundaries.md`, this service owns delivery only. It does
**not** own, generate, store, hash, or validate:

- users, passwords, sessions, or any authentication state
- email verification tokens or their expiry
- password reset tokens or their expiry
- OTPs or their expiry/attempt-count
- any decision about whether a token/OTP is correct

`servora-auth` remains the sole owner of all of the above. This service is handed a token/OTP that
Auth already generated, builds the message, and hands it to a delivery provider — nothing more.

## Architecture

```text
Browser
   |
   v
servora-web
   |
   v
servora-api-gateway  (public edge — never proxies this service's routes)
   |
   v
servora-auth  (generates tokens/OTPs, owns verification state)
   |
   | internal HTTP request, x-servora-internal-key
   v
servora-notification  (this repository)
   |
   +-------------------+
   v                    v
 Resend               console/dev
 (email)              SMS provider
```

`servora-notification` is reached only over an internal HTTP contract
(`/internal/v1/notifications/*`) authenticated with a shared `x-servora-internal-key`. It is never
exposed through the API Gateway as a public `/api/v1/notifications/*` route.

## Relationship with servora-auth

`servora-auth` is authoritative for identity, credentials, sessions, and verification state
(registration, `/email/verify`, `/email/resend`, `/phone/otp/request`, `/phone/otp/verify`,
`/password/reset/request`, `/password/reset/confirm`). When Auth needs a message delivered, it
calls this service's internal HTTP endpoints, passing the already-generated raw token/OTP once.
This service never stores, hashes, or re-validates that value — it is used once, to build a
message, and discarded.

**Known contract mismatch, documented rather than silently resolved:** `servora-auth`'s repository
already contains a *proposed* outbound integration
(`src/notifications/HttpNotificationPublisher.ts`), explicitly marked unconfirmed, that posts a
single generic event envelope to `POST /internal/v1/events` (no `x-servora-internal-key`, and
`expiresAt` instead of `expiresInSeconds`). That is a **different** shape than the one implemented
here. `servora-docs` itself does not define a concrete intake contract — it only assigns "Email/SMS
push delivery" to this service and hints that the eventual mechanism might be an async RabbitMQ
event (`02-architecture/event-architecture.md`, `communication.md`, both `Status: DESIGNED`, not
implemented anywhere yet). This service was built to the three-endpoint, resource-oriented HTTP
contract specified for it (see "Internal API" below), matching Auth's already-established
synchronous-HTTP-first reality rather than the longer-term RabbitMQ aspiration. See
`docs/integration.md` for the full detail. Reconciling `HttpNotificationPublisher.ts` with this
service's actual contract is Auth-side follow-up work — this repository does not modify
`servora-auth`.

## Relationship with servora-api-gateway

The gateway is the public edge and does not proxy anything under
`/internal/v1/notifications/*`. Nothing here is reachable from a browser, directly or indirectly
through the gateway.

## Relationship with servora-docs

`servora-docs` is the cross-service source of truth. This service's responsibility, boundaries,
and non-goals all trace back to `02-architecture/service-boundaries.md`. Where `servora-docs` is
silent on a concrete detail (the internal HTTP contract shape, the frontend verification/reset
routes), this repository documents the assumption made rather than inventing an undocumented
cross-service contract silently — see "Assumptions" in `docs/integration.md`.

## Local setup

Requires Node.js 24 (see `engines` in `package.json`). No database, no Redis, no message broker.

```bash
cp .env.example .env      # edit as needed; never commit this file
npm install
npm run dev                # tsx watch, local dev on :4009
```

```bash
npm run dev          # tsx watch
npm run build        # tsc -> dist/, then copies templates into dist/templates
npm run start        # run the compiled build (node dist/server.js)
npm run lint         # eslint
npm run lint:fix     # eslint --fix
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run test:watch   # vitest
```

## Environment variables

See `.env.example` for the full list.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | no (default `development`) | `development` \| `test` \| `production` |
| `PORT` | no (default `4009`) | Render overrides this; the app always respects `process.env.PORT` |
| `HOST` | no (default `0.0.0.0`) | Must stay `0.0.0.0` in Docker/Render |
| `INTERNAL_SERVICE_KEY` | yes, outside `NODE_ENV=test` | Shared secret for `x-servora-internal-key`. Never log it, never send it to a browser |
| `APP_PUBLIC_URL` | yes | Base URL used to build verification/reset links |
| `EMAIL_PROVIDER` | no (default `console`) | `console` \| `resend` |
| `RESEND_API_KEY` | required only if `EMAIL_PROVIDER=resend` | |
| `EMAIL_FROM` | required only if `EMAIL_PROVIDER=resend` | e.g. `Servora <noreply@yourdomain.com>` |
| `SMS_PROVIDER` | no (default `console`) | Only `console` is implemented today |

Config is validated at boot with Zod (`src/config/env.ts`); the process refuses to start with an
invalid or incomplete configuration rather than degrading unpredictably.

## Resend configuration (production email)

1. Create a Resend account and verify a sending domain.
2. Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=<secret>`, `EMAIL_FROM=<verified sender>`.
3. The API key is never logged and never appears in any response body.
4. On a Resend API failure, the client receives a generic `502 PROVIDER_ERROR` — never the raw
   Resend error, which could contain internal details.

## Console development mode

`EMAIL_PROVIDER=console` (the default) simulates delivery without any Resend account:

```text
Email notification accepted (console provider)
type=email-verification
recipient=alice@example.com
```

Only non-sensitive metadata (notification type, recipient, subject) is logged — never the
rendered HTML/text body, which is the only place the verification/reset URL (and therefore the
raw token) appears.

## SMS provider configuration

`SMS_PROVIDER=console` is the only implemented provider today. It logs recipient and notification
type, never the message body (which contains the raw OTP). `servora-docs` does not specify a
concrete production SMS provider yet; when it does, a new `SmsProvider` implementation can be
added under `src/providers/sms/` without touching any call site. This service never generates,
stores, or validates OTPs — it only sends the OTP value supplied by Auth.

## Internal authentication

Every route under `/internal/v1/notifications/*` requires the `x-servora-internal-key` header,
compared against `INTERNAL_SERVICE_KEY` using a constant-time comparison
(`src/utils/compare.ts`). Missing or incorrect key:

```json
{
  "error": {
    "code": "INTERNAL_AUTH_FAILED",
    "message": "Missing or incorrect x-servora-internal-key.",
    "requestId": "..."
  }
}
```

with HTTP `401`. This header must never be sent by a browser or appear in frontend configuration.

## API endpoints

Base path: `/internal/v1/notifications` — internal service-to-service only, never proxied through
the API Gateway. Full request/response schemas: [`docs/api.md`](docs/api.md).

| Method & path | Purpose |
|---|---|
| `POST /internal/v1/notifications/email-verification` | Send the "verify your email" message |
| `POST /internal/v1/notifications/password-reset` | Send the "reset your password" message |
| `POST /internal/v1/notifications/phone-otp` | Send the OTP SMS |
| `GET /health` | Liveness |
| `GET /ready` | Readiness (verifies runtime configuration) |

## curl examples

```bash
curl -i -X POST http://localhost:4009/internal/v1/notifications/email-verification \
  -H "Content-Type: application/json" \
  -H "x-servora-internal-key: $INTERNAL_SERVICE_KEY" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000001",
    "email": "test@example.com",
    "verificationToken": "example-token"
  }'
```

```bash
curl -i -X POST http://localhost:4009/internal/v1/notifications/password-reset \
  -H "Content-Type: application/json" \
  -H "x-servora-internal-key: $INTERNAL_SERVICE_KEY" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000001",
    "email": "test@example.com",
    "resetToken": "example-reset-token"
  }'
```

```bash
curl -i -X POST http://localhost:4009/internal/v1/notifications/phone-otp \
  -H "Content-Type: application/json" \
  -H "x-servora-internal-key: $INTERNAL_SERVICE_KEY" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000001",
    "phone": "+14155551234",
    "otp": "123456",
    "expiresInSeconds": 300
  }'
```

```bash
curl -i http://localhost:4009/health
curl -i http://localhost:4009/ready
```

All three examples above were run against a locally built copy of this service during development
and returned `202 { "accepted": true }`.

## Testing

```bash
npm test
```

Vitest, no external infrastructure required. Covers: internal-auth guard (missing/wrong/correct
key), request validation for all three endpoints, correct recipient/subject/body construction,
URL-encoding of tokens, that raw tokens/OTPs never appear in captured logs, provider-failure
mapping to `502 PROVIDER_ERROR`, and `/health`/`/ready`.

## Docker usage

```bash
docker build -t servora-notification .
docker run --rm -p 4009:4009 --env-file .env servora-notification
```

or

```bash
docker compose up --build
```

The default `docker-compose.yml` uses `EMAIL_PROVIDER=console` and `SMS_PROVIDER=console`, so the
service starts without any paid third-party account.

## Render deployment

- **Build command:** `npm ci && npm run build`
- **Start command:** `npm start`
- The app binds to `0.0.0.0` and always respects Render's injected `PORT` (default `4009` only
  when `PORT` is unset, e.g. local dev).

Expected production environment variables:

```text
NODE_ENV=production
INTERNAL_SERVICE_KEY=<strong-secret>
APP_PUBLIC_URL=https://servora.hemandu.com
EMAIL_PROVIDER=resend
RESEND_API_KEY=<resend-secret>
EMAIL_FROM=<verified-resend-sender>
SMS_PROVIDER=console
```

Never commit `.env` or real secrets — see `.gitignore`.

## Security notes

- Never logged: passwords (n/a — this service never sees one), raw verification tokens, raw reset
  tokens, OTPs, `RESEND_API_KEY`, `INTERNAL_SERVICE_KEY`.
- `x-servora-internal-key` is compared with a constant-time comparison
  (`src/utils/compare.ts`).
- Request body size is capped (16 KB) to limit abuse of these internal endpoints.
- Provider failures never leak the underlying provider's raw error to the client — always a
  generic `502 PROVIDER_ERROR`.
- This service does not implement Auth's business rate limits (registration/login/resend/OTP
  cooldowns, etc.) — those remain entirely owned by `servora-auth`, per `servora-docs`.

## Future asynchronous/queue considerations

`servora-docs/02-architecture/event-architecture.md` and `communication.md` describe RabbitMQ as
the intended long-term mechanism for asynchronous work including email/SMS, but that is marked
`Status: DESIGNED`, not implemented anywhere in the Servora codebase today. This service
deliberately starts with the explicit internal HTTP contract instead of introducing a broker
prematurely (no persistence, no Redis, no queue — see `docs/architecture.md`). If/when RabbitMQ is
actually wired up platform-wide, the natural migration is: Auth publishes an event instead of
calling this service directly, and this service (or a queue consumer built on top of the same
`NotificationService`/provider layer) consumes it — the provider abstractions and templates in
`src/providers/` and `src/templates/` do not need to change either way.
#   s e r v o r a - n o t i f i c a t i o n  
 