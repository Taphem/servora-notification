# Internal API

Base path: `/internal/v1/notifications`

These endpoints are **internal service-to-service only**. They are never proxied through
`servora-api-gateway` and there is no equivalent `/api/v1/notifications/*` public route.

## Headers (all endpoints below)

```text
Content-Type: application/json
x-servora-internal-key: <INTERNAL_SERVICE_KEY>
```

Missing or incorrect `x-servora-internal-key` → `401`:

```json
{
  "error": {
    "code": "INTERNAL_AUTH_FAILED",
    "message": "Missing or incorrect x-servora-internal-key.",
    "requestId": "<request-id>"
  }
}
```

---

## `POST /internal/v1/notifications/email-verification`

**Request body**

| Field | Type | Rules |
|---|---|---|
| `userId` | string | UUID-shaped (8-4-4-4-12 hex) |
| `email` | string | valid email, max 320 characters |
| `verificationToken` | string | 1–1024 characters |

```json
{
  "userId": "00000000-0000-0000-0000-000000000001",
  "email": "alice@example.com",
  "verificationToken": "example-token"
}
```

This service does not store, hash, or validate `verificationToken` — it is used once to build the
verification URL (`APP_PUBLIC_URL` + `/verify-email?token=<url-encoded token>`) and passed to the
email provider.

**Success — `202`**

```json
{ "accepted": true }
```

**Errors**

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_FAILED` | Body fails schema validation |
| `401` | `INTERNAL_AUTH_FAILED` | Missing/incorrect internal key |
| `502` | `PROVIDER_ERROR` | Email provider (Resend, or the console provider's simulated failure) rejected/failed the request |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

**curl**

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

---

## `POST /internal/v1/notifications/password-reset`

**Request body**

| Field | Type | Rules |
|---|---|---|
| `userId` | string | UUID-shaped |
| `email` | string | valid email, max 320 characters |
| `resetToken` | string | 1–1024 characters |

```json
{
  "userId": "00000000-0000-0000-0000-000000000001",
  "email": "alice@example.com",
  "resetToken": "example-reset-token"
}
```

Not stored, hashed, or validated here — used once to build the reset URL (`APP_PUBLIC_URL` +
`/reset-password?token=<url-encoded token>`).

**Success — `202`**

```json
{ "accepted": true }
```

**Errors:** same table as email-verification above.

**curl**

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

---

## `POST /internal/v1/notifications/phone-otp`

**Request body**

| Field | Type | Rules |
|---|---|---|
| `userId` | string | UUID-shaped |
| `phone` | string | E.164 (`+` followed by 2–15 digits, no leading zero) |
| `otp` | string | 4–10 characters |
| `expiresInSeconds` | integer | positive |

```json
{
  "userId": "00000000-0000-0000-0000-000000000001",
  "phone": "+14155551234",
  "otp": "123456",
  "expiresInSeconds": 300
}
```

This service does not generate, store, hash, or validate the OTP, and does not decide whether it
is correct or expired — it only sends it. Message sent:

```text
Your Servora verification code is 123456. It expires in 5 minutes.
```

**Success — `202`**

```json
{ "accepted": true }
```

**Errors**

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_FAILED` | Body fails schema validation |
| `401` | `INTERNAL_AUTH_FAILED` | Missing/incorrect internal key |
| `502` | `PROVIDER_ERROR` | SMS provider failed |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

**curl**

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

---

## `GET /health`

Liveness. Always `200` while the process is alive.

```json
{ "status": "ok" }
```

```bash
curl -i http://localhost:4009/health
```

## `GET /ready`

Readiness. Checks that `INTERNAL_SERVICE_KEY` is configured and, when `EMAIL_PROVIDER=resend`,
that `RESEND_API_KEY`/`EMAIL_FROM` are set.

```json
{ "status": "ready" }
```

or, `503`:

```json
{ "status": "not_ready" }
```

```bash
curl -i http://localhost:4009/ready
```
