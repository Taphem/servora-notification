import { describe, expect, it } from 'vitest';
import { buildTestApp, TEST_INTERNAL_SERVICE_KEY, VALID_USER_ID } from './helpers/buildTestApp.js';

function post(app: ReturnType<typeof buildTestApp>['app'], payload: Record<string, unknown>, headers: Record<string, string> = {}) {
  return app.inject({
    method: 'POST',
    url: '/internal/v1/notifications/account-created',
    headers: { 'x-servora-internal-key': TEST_INTERNAL_SERVICE_KEY, ...headers },
    payload,
  });
}

const PASSWORD_BODY = {
  userId: VALID_USER_ID,
  email: 'alice@example.com',
  authenticationMethod: 'password',
  emailVerified: false,
};

const GOOGLE_BODY = {
  userId: VALID_USER_ID,
  email: 'alice@example.com',
  authenticationMethod: 'google',
  emailVerified: true,
};

describe('POST /internal/v1/notifications/account-created', () => {
  it('returns 202 { accepted: true } for an authorized, valid request', async () => {
    const { app } = buildTestApp();

    const response = await post(app, PASSWORD_BODY);

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
  });

  it('rejects an unauthorized request (missing internal key)', async () => {
    const { app } = buildTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/internal/v1/notifications/account-created',
      payload: PASSWORD_BODY,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'INTERNAL_AUTH_FAILED' } });
  });

  it('rejects an invalid email', async () => {
    const { app } = buildTestApp();

    const response = await post(app, { ...PASSWORD_BODY, email: 'not-an-email' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
  });

  it('rejects a missing userId', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      email: 'alice@example.com',
      authenticationMethod: 'password',
      emailVerified: false,
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects an invalid authenticationMethod', async () => {
    const { app } = buildTestApp();

    const response = await post(app, { ...PASSWORD_BODY, authenticationMethod: 'facebook' });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a non-boolean emailVerified value', async () => {
    const { app } = buildTestApp();

    const response = await post(app, { ...PASSWORD_BODY, emailVerified: 'yes' });

    expect(response.statusCode).toBe(400);
  });

  it('sends the password variant for a password account-created event', async () => {
    const { app, emailProvider } = buildTestApp();

    await post(app, PASSWORD_BODY);

    expect(emailProvider.calls).toHaveLength(1);
    expect(emailProvider.calls[0]).toMatchObject({
      to: 'alice@example.com',
      subject: 'Welcome to Servora',
      type: 'account-created',
    });
  });

  it('password account-created email does not claim the email is already verified', async () => {
    const { app, emailProvider } = buildTestApp();

    await post(app, PASSWORD_BODY);

    const call = emailProvider.calls[0];
    expect(call!.text.toLowerCase()).not.toContain('already been verified');
    expect(call!.text.toLowerCase()).not.toContain('verified successfully');
    expect(call!.text).toContain("We've sent you a separate email to verify your email address.");
  });

  it('sends the google variant for a google account-created event', async () => {
    const { app, emailProvider } = buildTestApp();

    await post(app, GOOGLE_BODY);

    expect(emailProvider.calls).toHaveLength(1);
    expect(emailProvider.calls[0]).toMatchObject({
      to: 'alice@example.com',
      subject: 'Welcome to Servora',
      type: 'account-created',
    });
  });

  it('google account-created email mentions Google as the authentication method', async () => {
    const { app, emailProvider } = buildTestApp();

    await post(app, GOOGLE_BODY);

    expect(emailProvider.calls[0]!.text).toContain('Google');
  });

  it('google account-created email treats the email as already verified', async () => {
    const { app, emailProvider } = buildTestApp();

    await post(app, GOOGLE_BODY);

    expect(emailProvider.calls[0]!.text.toLowerCase()).toContain('already been verified');
  });

  it('account-created email (either variant) never contains a verification token or link', async () => {
    const { app, emailProvider } = buildTestApp();

    await post(app, PASSWORD_BODY);
    await post(app, GOOGLE_BODY);

    for (const call of emailProvider.calls) {
      expect(call.html).not.toContain('/verify-email');
      expect(call.text).not.toContain('/verify-email');
      expect(call.html).not.toMatch(/token=/);
    }
  });

  it('the account-created CTA link uses APP_PUBLIC_URL, not a hardcoded domain', async () => {
    const { app, emailProvider } = buildTestApp();

    await post(app, PASSWORD_BODY);

    expect(emailProvider.calls[0]!.html).toContain('href="http://localhost:3000/"');
  });

  it('returns 502 PROVIDER_ERROR when the email provider fails', async () => {
    const { app, emailProvider } = buildTestApp();
    emailProvider.shouldFail = true;

    const response = await post(app, PASSWORD_BODY);

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ error: { code: 'PROVIDER_ERROR' } });
  });
});
