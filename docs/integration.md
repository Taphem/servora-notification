# Integration with servora-auth

`servora-auth` is the only expected caller of this service today. This document describes how it
is expected to call in, what it needs configured, and — because this is genuinely unresolved — the
known mismatch between this service's contract and Auth's current (proposed) outbound client code.

## How servora-auth calls notification

For each of the three flows, Auth makes one synchronous internal HTTP `POST`:

| Auth-side trigger | Call into this service |
|---|---|
| `POST /api/v1/auth/register`, `POST /api/v1/auth/email/resend` | `POST /internal/v1/notifications/email-verification` |
| `POST /api/v1/auth/password/reset/request` | `POST /internal/v1/notifications/password-reset` |
| `POST /api/v1/auth/phone/otp/request` | `POST /internal/v1/notifications/phone-otp` |

Auth remains responsible for generating the token/OTP, persisting its hashed form with an
expiry, and later consuming/validating it (`/email/verify`, `/password/reset/confirm`,
`/phone/otp/verify`). This service is handed the **raw** value exactly once, over HTTPS in
production, and never sees it again.

## Internal service authentication

Every request must include:

```text
x-servora-internal-key: <INTERNAL_SERVICE_KEY>
```

`INTERNAL_SERVICE_KEY` must be the same shared secret value configured on both sides. It is
compared with a constant-time comparison (`src/utils/compare.ts`) — never a plain `===`, to avoid
a timing side-channel. Missing/incorrect key → `401 INTERNAL_AUTH_FAILED`; this service does
**not** fail open.

## Environment variables required on the Auth side (informational — not owned by this repo)

Auth needs, at minimum, a base URL for this service and the shared internal key, e.g.
`NOTIFICATION_SERVICE_URL` and `INTERNAL_SERVICE_KEY` (naming is Auth's own choice — this
repository does not modify `servora-auth`). Auth's own `HttpNotificationPublisher` currently reads
a `NOTIFICATION_SERVICE_URL` env var pointed at `/internal/v1/events`; per the mismatch below, that
path and payload shape would need to change to call the three endpoints documented in `api.md`.

## Production / local URLs

| Environment | Base URL |
|---|---|
| Local development | `http://127.0.0.1:4009` |
| Docker Compose | `http://notification:4009` (service name) or `http://localhost:4009` from the host |
| Production (Render) | The Render-assigned service URL for this app, reachable only from other internal Servora services on the private network — never exposed publicly through the Gateway |

## Integration testing procedure

1. Start this service locally with `EMAIL_PROVIDER=console` and `SMS_PROVIDER=console` (the
   `.env.example` defaults) — no Resend account needed.
2. From `servora-auth` (once its outbound client is updated to match this contract — see below),
   point its notification base URL at `http://127.0.0.1:4009` and set the same
   `INTERNAL_SERVICE_KEY` on both services.
3. Exercise Auth's public flows (`/register`, `/password/reset/request`, `/phone/otp/request`) and
   confirm this service's console-provider logs show `Email notification accepted` /
   `SMS notification accepted` with the expected recipient and type — never a raw token/OTP.
4. To test real Resend delivery, set `EMAIL_PROVIDER=resend` with a real `RESEND_API_KEY` and a
   verified `EMAIL_FROM`, and repeat.

## Known contract mismatch — not silently resolved

`servora-docs` does not define a concrete HTTP intake contract for this service. It only:

- assigns "Email/SMS/push delivery" to Notification
  (`02-architecture/service-boundaries.md`), and
- classifies email/SMS as asynchronous work, suggesting RabbitMQ as the eventual mechanism
  (`02-architecture/event-architecture.md`, `communication.md`, ADR-004) — all marked
  `Status: DESIGNED`, not implemented anywhere in the Servora codebase yet.

Separately, `servora-auth`'s own repository already contains a **proposed, explicitly-unconfirmed**
outbound integration (`src/notifications/HttpNotificationPublisher.ts`, `src/notifications/events.ts`):

- Single endpoint: `POST {NOTIFICATION_SERVICE_URL}/internal/v1/events`
- Single generic envelope for all three notification types (`NotificationEvent` union), keyed by a
  `type` discriminator
- **No `x-servora-internal-key` header sent**
- `expiresAt` (ISO timestamp) instead of `expiresInSeconds`

This service was built to the contract specified for it: three resource-oriented endpoints under
`/internal/v1/notifications/*`, `x-servora-internal-key` required on every call, and
`expiresInSeconds` (not `expiresAt`) for the OTP flow. This is a deliberate choice, not an
oversight — since `servora-docs` doesn't mandate a specific shape, the more detailed,
security-conscious contract (internal auth required, resource-oriented paths, no generic
catch-all envelope) was implemented as specified.

**Practical consequence:** `servora-auth`'s current `HttpNotificationPublisher` will not
successfully call this service as-is. Updating it to POST to the three endpoints in `api.md` with
the internal key header is Auth-side follow-up work; per the instructions for this task,
`servora-auth` was not modified to do so.

## Assumptions made (frontend routes)

Neither `servora-docs` nor `servora-web` (which currently has no verification/reset pages
implemented) define a frontend verification or password-reset route. This service assumes:

- Email verification link: `{APP_PUBLIC_URL}/verify-email?token=<url-encoded token>`
- Password reset link: `{APP_PUBLIC_URL}/reset-password?token=<url-encoded token>`

(`src/utils/urls.ts`). If `servora-web`/`servora-docs` later define real routes, update only that
one file.
