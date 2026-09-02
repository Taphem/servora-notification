import { describe, expect, it } from 'vitest';
import { buildTestApp, TEST_INTERNAL_SERVICE_KEY, VALID_USER_ID } from './helpers/buildTestApp.js';

function post(app: ReturnType<typeof buildTestApp>['app'], payload: Record<string, unknown>) {
  return app.inject({
    method: 'POST',
    url: '/internal/v1/notifications/auth-login',
    headers: { 'x-servora-internal-key': TEST_INTERNAL_SERVICE_KEY },
    payload,
  });
}

const PASSWORD_BODY = {
  userId: VALID_USER_ID,
  email: 'alice@example.com',
  authenticationMethod: 'password',
};

const GOOGLE_BODY = {
  userId: VALID_USER_ID,
  email: 'alice@example.com',
  authenticationMethod: 'google',
};

describe('POST /internal/v1/notifications/auth-login', () => {
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
      url: '/internal/v1/notifications/auth-login',
      payload: PASSWORD_BODY,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'INTERNAL_AUTH_FAILED' } });
  });

  it('rejects an invalid email', async () => {
    const { app } = buildTestApp();

    const response = await post(app, { ...PASSWORD_BODY, email: 'not-an-email' });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a missing userId', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      email: 'alice@example.com',
      authenticationMethod: 'password',
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects an invalid authenticationMethod', async () => {
    const { app } = buildTestApp();

    const response = await post(app, { ...PASSWORD_BODY, authenticationMethod: 'facebook' });

    expect(response.statusCode).toBe(400);
  });

  it('sends the password-login email for a password login event', async () => {
    const { app, emailProvider } = buildTestApp();

    await post(app, PASSWORD_BODY);

    expect(emailProvider.calls).toHaveLength(1);
    expect(emailProvider.calls[0]).toMatchObject({
      to: 'alice@example.com',
      subject: 'New sign-in to your Servora account',
      type: 'auth-login',
    });
    expect(emailProvider.calls[0]!.text).toContain('email and password');
  });

  it('sends the google-login email for a google login event', async () => {
    const { app, emailProvider } = buildTestApp();

    await post(app, GOOGLE_BODY);

    expect(emailProvider.calls).toHaveLength(1);
    expect(emailProvider.calls[0]).toMatchObject({
      to: 'alice@example.com',
      subject: 'New sign-in to your Servora account',
      type: 'auth-login',
    });
    expect(emailProvider.calls[0]!.text).toContain('Google');
  });

  it('login emails contain no credentials, tokens, secrets, or fabricated device/location metadata', async () => {
    const { app, emailProvider } = buildTestApp();

    await post(app, PASSWORD_BODY);
    await post(app, GOOGLE_BODY);

    for (const call of emailProvider.calls) {
      // Checked against the plain-text body only — the HTML body legitimately
      // contains incidental markup noise (e.g. `width=device-width` in the
      // viewport meta tag) that would false-positive a substring check.
      const body = call.text.toLowerCase();
      expect(body).not.toContain(TEST_INTERNAL_SERVICE_KEY.toLowerCase());
      expect(body).not.toContain('token');
      expect(body).not.toContain('secret');
      expect(body).not.toContain('ip address');
      expect(body).not.toContain('location');
      expect(body).not.toContain('browser');
      expect(body).not.toContain('device');
    }
  });

  it('returns 502 PROVIDER_ERROR when the email provider fails', async () => {
    const { app, emailProvider } = buildTestApp();
    emailProvider.shouldFail = true;

    const response = await post(app, PASSWORD_BODY);

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ error: { code: 'PROVIDER_ERROR' } });
  });
});
