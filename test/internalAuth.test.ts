import { describe, expect, it } from 'vitest';
import { buildTestApp, TEST_INTERNAL_SERVICE_KEY, VALID_USER_ID } from './helpers/buildTestApp.js';

const VALID_BODY = {
  userId: VALID_USER_ID,
  email: 'alice@example.com',
  verificationToken: 'a-valid-token',
};

describe('internal service authentication', () => {
  it('rejects a request with no x-servora-internal-key header', async () => {
    const { app } = buildTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/internal/v1/notifications/email-verification',
      payload: VALID_BODY,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'INTERNAL_AUTH_FAILED' },
    });
  });

  it('rejects a request with an incorrect x-servora-internal-key header', async () => {
    const { app } = buildTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/internal/v1/notifications/email-verification',
      headers: { 'x-servora-internal-key': 'wrong-key' },
      payload: VALID_BODY,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'INTERNAL_AUTH_FAILED' },
    });
  });

  it('proceeds when the correct x-servora-internal-key header is supplied', async () => {
    const { app } = buildTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/internal/v1/notifications/email-verification',
      headers: { 'x-servora-internal-key': TEST_INTERNAL_SERVICE_KEY },
      payload: VALID_BODY,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
  });

  it('every error response includes a requestId', async () => {
    const { app } = buildTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/internal/v1/notifications/email-verification',
      payload: VALID_BODY,
    });

    expect(response.json().error.requestId).toEqual(expect.any(String));
    expect(response.json().error.requestId.length).toBeGreaterThan(0);
  });
});
