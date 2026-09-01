# Architecture

## Service responsibility

Per `servora-docs/02-architecture/service-boundaries.md`:

| Service | Responsibility |
|---|---|
| Notification | Email/SMS/push delivery |

This repository implements that responsibility, and only that responsibility: transactional email
delivery, SMS delivery, email/SMS templates, provider integration and error handling, delivery
logging, and internal-request validation.

## Service boundary

This service explicitly does **not** own: users, passwords, authentication, sessions, email
verification state, phone verification state, password reset state, token generation, token
verification, OTP generation, OTP verification, user authorization, booking logic, payment logic,
or business/provider profiles. All of that remains with the services that already own it
(`servora-auth` for everything identity/credential/verification-related).

Concretely: this service receives a raw token or OTP **once**, in a single internal HTTP request,
uses it to render a message, hands that message to a provider, and returns. It never persists the
token/OTP, never hashes it, never checks it against anything, and never makes any pass/fail
decision about it.

## Relationship to Auth

`servora-auth` is the caller. It generates tokens/OTPs, persists their hashed form with an
expiry, and is the only thing that can mark an email or phone verified. When it needs a message
delivered, it makes one internal HTTP request to this service. See `integration.md` for the exact
contract and the known discrepancy with Auth's current (proposed, unconfirmed) outbound client
code.

## Relationship to Gateway

The API Gateway is the public edge (`servora-docs/02-architecture/api-gateway.md`). It does not
list, and must not proxy, anything under `/internal/v1/notifications/*`. This service is only ever
reachable from other internal services on the private network, never from a browser.

## Provider architecture

```text
NotificationService
      |
      +-- EmailProvider (interface)
      |     +-- ConsoleEmailProvider   (EMAIL_PROVIDER=console, default)
      |     +-- ResendEmailProvider    (EMAIL_PROVIDER=resend)
      |
      +-- SmsProvider (interface)
            +-- ConsoleSmsProvider     (SMS_PROVIDER=console, only implementation today)
```

`NotificationService` (`src/services/notificationService.ts`) is the only thing that knows how to
turn a request into a rendered message. It depends on the `EmailProvider`/`SmsProvider`
interfaces, never on a concrete provider — swapping Resend for another vendor, or adding a real
SMS vendor later, means writing a new provider class and wiring it in
`src/providers/*/index.ts`, not touching the service or route layer.

## Why no persistence, Redis, or a queue

- **No database.** This service is stateless from a business-data perspective — see
  `servora-docs` ADR-002 (PostgreSQL is for services that own durable state; this one doesn't own
  any). Tokens/OTPs are never stored here.
- **No Redis.** Per ADR-003, Redis backs non-authoritative state (rate limits, cooldowns) for
  services that need it. This service doesn't implement Auth's business rate limits (see
  `servora-docs/08-security/rate-limiting.md` — registration/login/OTP/reset limits are owned by
  Auth), so there is nothing here that needs a distributed counter yet.
- **No message broker.** `event-architecture.md`/`communication.md`/ADR-004 describe RabbitMQ as
  the eventual mechanism for async work including email/SMS, but mark it `Status: DESIGNED` —
  nothing in the Servora codebase runs on it today, including `servora-auth`'s own outbound
  notification code, which itself uses a plain HTTP `fetch` as an explicitly-labeled stand-in
  (`servora-auth/src/notifications/HttpNotificationPublisher.ts`). This service matches that
  current reality: an explicit internal HTTP contract, with the provider/template layers
  structured so a queue consumer could be added later without changing them.
