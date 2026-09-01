import { describe, expect, it } from 'vitest';
import { buildTestApp, TEST_INTERNAL_SERVICE_KEY, VALID_USER_ID } from './helpers/buildTestApp.js';

const RAW_TOKEN = 'super-secret-verification-token-!@#';

function post(app: ReturnType<typeof buildTestApp>['app'], payload: Record<string, unknown>) {
  return app.inject({
    method: 'POST',
    url: '/internal/v1/notifications/email-verification',
    headers: { 'x-servora-internal-key': TEST_INTERNAL_SERVICE_KEY },
    payload,
  });
}

describe('POST /internal/v1/notifications/email-verification', () => {
  it('returns 202 { accepted: true } for a valid request', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: VALID_USER_ID,
      email: 'alice@example.com',
      verificationToken: RAW_TOKEN,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
  });

  it('sends to the correct recipient with the correct subject', async () => {
    const { app, emailProvider } = buildTestApp();

    await post(app, {
      userId: VALID_USER_ID,
      email: 'alice@example.com',
      verificationToken: RAW_TOKEN,
    });

    expect(emailProvider.calls).toHaveLength(1);
    expect(emailProvider.calls[0]).toMatchObject({
      to: 'alice@example.com',
      subject: 'Verify your Servora email',
      type: 'email-verification',
    });
  });

  it('builds a verification URL against APP_PUBLIC_URL with the token URL-encoded', async () => {
    const { app, emailProvider } = buildTestApp();
    const tokenWithSpecialChars = 'token with spaces & symbols';

    await post(app, {
      userId: VALID_USER_ID,
      email: 'alice@example.com',
      verificationToken: tokenWithSpecialChars,
    });

    const call = emailProvider.calls[0];
    expect(call).toBeDefined();
    expect(call!.html).toContain('http://localhost:3000/verify-email?token=');
    expect(call!.text).toContain('http://localhost:3000/verify-email?token=');

    const match = call!.html.match(/href="(http:\/\/localhost:3000\/verify-email\?token=[^"]+)"/);
    expect(match).not.toBeNull();
    const url = new URL(match![1]!);
    expect(url.searchParams.get('token')).toBe(tokenWithSpecialChars);
    expect(call!.html).not.toContain(tokenWithSpecialChars);
  });

  it('never logs the raw verification token', async () => {
    const { app, logLines } = buildTestApp({ capture: true });

    await post(app, {
      userId: VALID_USER_ID,
      email: 'alice@example.com',
      verificationToken: RAW_TOKEN,
    });

    const serialized = JSON.stringify(logLines);
    expect(serialized).not.toContain(RAW_TOKEN);
  });

  it('rejects an invalid userId (not a UUID)', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: 'not-a-uuid',
      email: 'alice@example.com',
      verificationToken: RAW_TOKEN,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
  });

  it('rejects an invalid email', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: VALID_USER_ID,
      email: 'not-an-email',
      verificationToken: RAW_TOKEN,
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a missing token', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: VALID_USER_ID,
      email: 'alice@example.com',
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects an empty token', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: VALID_USER_ID,
      email: 'alice@example.com',
      verificationToken: '',
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a token longer than 1024 characters', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: VALID_USER_ID,
      email: 'alice@example.com',
      verificationToken: 'a'.repeat(1025),
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 502 PROVIDER_ERROR when the email provider fails', async () => {
    const { app, emailProvider } = buildTestApp();
    emailProvider.shouldFail = true;

    const response = await post(app, {
      userId: VALID_USER_ID,
      email: 'alice@example.com',
      verificationToken: RAW_TOKEN,
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ error: { code: 'PROVIDER_ERROR' } });
    expect(JSON.stringify(response.json())).not.toContain('simulated failure');
  });
});
