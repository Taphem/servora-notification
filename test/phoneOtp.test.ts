import { describe, expect, it } from 'vitest';
import { buildTestApp, TEST_INTERNAL_SERVICE_KEY, VALID_USER_ID } from './helpers/buildTestApp.js';

const VALID_PHONE = '+14155551234';
const VALID_OTP = '123456';

function post(app: ReturnType<typeof buildTestApp>['app'], payload: Record<string, unknown>) {
  return app.inject({
    method: 'POST',
    url: '/internal/v1/notifications/phone-otp',
    headers: { 'x-servora-internal-key': TEST_INTERNAL_SERVICE_KEY },
    payload,
  });
}

describe('POST /internal/v1/notifications/phone-otp', () => {
  it('returns 202 { accepted: true } for a valid request', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: VALID_USER_ID,
      phone: VALID_PHONE,
      otp: VALID_OTP,
      expiresInSeconds: 300,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
  });

  it('sends to the correct phone number', async () => {
    const { app, smsProvider } = buildTestApp();

    await post(app, {
      userId: VALID_USER_ID,
      phone: VALID_PHONE,
      otp: VALID_OTP,
      expiresInSeconds: 300,
    });

    expect(smsProvider.calls).toHaveLength(1);
    expect(smsProvider.calls[0]!.to).toBe(VALID_PHONE);
  });

  it('includes the correct OTP and expiration information in the message body', async () => {
    const { app, smsProvider } = buildTestApp();

    await post(app, {
      userId: VALID_USER_ID,
      phone: VALID_PHONE,
      otp: VALID_OTP,
      expiresInSeconds: 300,
    });

    expect(smsProvider.calls[0]!.body).toBe('Your Servora verification code is 123456. It expires in 5 minutes.');
  });

  it('never logs the raw OTP', async () => {
    const { app, logLines } = buildTestApp({ capture: true });

    await post(app, {
      userId: VALID_USER_ID,
      phone: VALID_PHONE,
      otp: VALID_OTP,
      expiresInSeconds: 300,
    });

    const serialized = JSON.stringify(logLines);
    expect(serialized).not.toContain(VALID_OTP);
  });

  it('rejects an invalid userId (not a UUID)', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: 'not-a-uuid',
      phone: VALID_PHONE,
      otp: VALID_OTP,
      expiresInSeconds: 300,
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a phone number not in E.164 format', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: VALID_USER_ID,
      phone: '4155551234',
      otp: VALID_OTP,
      expiresInSeconds: 300,
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects an OTP shorter than 4 characters', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: VALID_USER_ID,
      phone: VALID_PHONE,
      otp: '12',
      expiresInSeconds: 300,
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a non-positive expiresInSeconds', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: VALID_USER_ID,
      phone: VALID_PHONE,
      otp: VALID_OTP,
      expiresInSeconds: 0,
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a request missing required fields', async () => {
    const { app } = buildTestApp();

    const response = await post(app, {
      userId: VALID_USER_ID,
      phone: VALID_PHONE,
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 502 PROVIDER_ERROR when the SMS provider fails', async () => {
    const { app, smsProvider } = buildTestApp();
    smsProvider.shouldFail = true;

    const response = await post(app, {
      userId: VALID_USER_ID,
      phone: VALID_PHONE,
      otp: VALID_OTP,
      expiresInSeconds: 300,
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ error: { code: 'PROVIDER_ERROR' } });
  });
});
