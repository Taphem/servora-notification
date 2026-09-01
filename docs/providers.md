# Providers

## Email

### `EmailProvider` interface (`src/providers/email/EmailProvider.ts`)

```ts
interface EmailProvider {
  sendEmail(input: SendEmailInput, logger: FastifyBaseLogger): Promise<void>;
}
```

`NotificationService` and the routes only ever depend on this interface — never on a concrete
provider class.

### Resend (`EMAIL_PROVIDER=resend`)

`ResendEmailProvider` (`src/providers/email/ResendEmailProvider.ts`) wraps the official `resend`
npm package. Configuration:

- `RESEND_API_KEY` — required. Never logged, never included in any response.
- `EMAIL_FROM` — required, e.g. `Servora <noreply@yourdomain.com>`.

Behavior on failure:

- A thrown exception (network error, timeout) or a non-null `result.error` from the Resend SDK is
  wrapped in a `ProviderError` and logged with only the error **name**, never the raw
  message/API key.
- Routes translate any `ProviderError` into `502 PROVIDER_ERROR` with a generic message — the
  client never sees Resend's raw error body, which could contain details about the sending
  domain/account configuration.
- A successful send never returns "sent" if the Resend call actually failed; failure always
  propagates as an exception, which the route layer maps to `502` before any `202` is sent.

### Console (`EMAIL_PROVIDER=console`, default)

`ConsoleEmailProvider` (`src/providers/email/ConsoleEmailProvider.ts`) simulates delivery without
requiring any Resend account or API key. It logs only:

```text
Email notification accepted (console provider)
type=email-verification
recipient=alice@example.com
subject=Verify your Servora email
```

It never logs the rendered HTML/text body — which is the only place the verification/reset URL
(and therefore the raw token) appears.

### Failure behavior (both providers)

Every route wraps the provider call in a try/catch. A `ProviderError` becomes:

```json
{
  "error": {
    "code": "PROVIDER_ERROR",
    "message": "Notification provider failed.",
    "requestId": "..."
  }
}
```

with HTTP `502`. No provider internals, stack traces, or the underlying error message reach the
client.

## SMS

### `SmsProvider` interface (`src/providers/sms/SmsProvider.ts`)

```ts
interface SmsProvider {
  sendSms(input: SendSmsInput, logger: FastifyBaseLogger): Promise<void>;
}
```

### Console (`SMS_PROVIDER=console`, only implementation today)

`ConsoleSmsProvider` (`src/providers/sms/ConsoleSmsProvider.ts`) logs only:

```text
SMS notification accepted (console provider)
type=phone-otp
recipient=+14155551234
```

It never logs `body`, which contains the raw OTP supplied by `servora-auth`. This service never
generates, stores, or validates OTPs; it only forwards the value it was given.

`servora-docs` does not specify a concrete production SMS provider at the time of writing. When it
does, add a new class implementing `SmsProvider` under `src/providers/sms/` and wire it into
`src/providers/sms/index.ts` — no other file needs to change.

## Provider configuration summary

| Env var | Values | Notes |
|---|---|---|
| `EMAIL_PROVIDER` | `console` (default) \| `resend` | `resend` requires `RESEND_API_KEY` and `EMAIL_FROM` |
| `SMS_PROVIDER` | `console` (default, only option) | |

Config validation (`src/config/env.ts`) refuses to boot with `EMAIL_PROVIDER=resend` and a missing
`RESEND_API_KEY`/`EMAIL_FROM`, rather than silently falling back to console mode or starting in a
broken state.
