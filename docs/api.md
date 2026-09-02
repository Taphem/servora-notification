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

## `POST /internal/v1/notifications/account-created`

**Request body**

| Field | Type | Rules |
|---|---|---|
| `userId` | string | UUID-shaped |
| `email` | string | valid email, max 320 characters |
| `authenticationMethod` | string | `"password"` \| `"google"` |
| `emailVerified` | boolean | — |

```json
{
  "userId": "00000000-0000-0000-0000-000000000001",
  "email": "alice@example.com",
  "authenticationMethod": "password",
  "emailVerified": false
}
```

Sent by Auth once per newly-created account (`AccountCreated` event). This service does not
decide who counts as "new" — that determination, and the account row itself, belong entirely to
`servora-auth`. Two email variants, selected by `authenticationMethod`:

- **`password`** — a welcome email that explicitly does *not* claim the address is verified. The
  separate `email-verification` notification (above) remains solely responsible for verification;
  this email never contains a verification link or token.
- **`google`** — a welcome email stating the account was created via Google and the email is
  already verified (Google's own verified-email claim). No verification link is sent for this
  variant.

Both variants link to the Servora home page (`APP_PUBLIC_URL`) via a "Go to Servora" button — never
a verification or reset path.

**Success — `202`**

```json
{ "accepted": true }
```

**Errors:** same table as email-verification above.

**curl**

```bash
curl -i -X POST http://localhost:4009/internal/v1/notifications/account-created \
  -H "Content-Type: application/json" \
  -H "x-servora-internal-key: $INTERNAL_SERVICE_KEY" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000001",
    "email": "test@example.com",
    "authenticationMethod": "password",
    "emailVerified": false
  }'
```

---

## `POST /internal/v1/notifications/auth-login`

**Request body**

| Field | Type | Rules |
|---|---|---|
| `userId` | string | UUID-shaped |
| `email` | string | valid email, max 320 characters |
| `authenticationMethod` | string | `"password"` \| `"google"` |

```json
{
  "userId": "00000000-0000-0000-0000-000000000001",
  "email": "alice@example.com",
  "authenticationMethod": "password"
}
```

Sent by Auth once per successful sign-in (`AuthLogin` event) — never for a session check/refresh
(e.g. `GET /session`) and never for a failed login attempt. A security-notification email states
the sign-in method used (email/password or Google) and asks the recipient to secure their account
if they didn't initiate it. It never fabricates IP address, location, browser, OS, or device
details — Auth's payload doesn't supply them, and this service does not infer or invent them.

**Success — `202`**

```json
{ "accepted": true }
```

**Errors:** same table as email-verification above.

**curl**

```bash
curl -i -X POST http://localhost:4009/internal/v1/notifications/auth-login \
  -H "Content-Type: application/json" \
  -H "x-servora-internal-key: $INTERNAL_SERVICE_KEY" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000001",
    "email": "test@example.com",
    "authenticationMethod": "password"
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
