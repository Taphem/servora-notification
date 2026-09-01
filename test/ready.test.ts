import { describe, expect, it } from 'vitest';
import { isReady } from '../src/routes/health.js';
import { loadEnv } from '../src/config/env.js';

describe('isReady', () => {
  it('is ready when EMAIL_PROVIDER=console and the internal key is set', () => {
    const env = loadEnv({ NODE_ENV: 'test', APP_PUBLIC_URL: 'http://localhost:3000' });
    expect(isReady(env)).toBe(true);
  });

  it('is not ready when EMAIL_PROVIDER=resend is missing its Resend configuration', () => {
    const env = loadEnv({ NODE_ENV: 'test', APP_PUBLIC_URL: 'http://localhost:3000' });
    const notReadyEnv = { ...env, emailProvider: 'resend' as const, resendApiKey: undefined, emailFrom: undefined };
    expect(isReady(notReadyEnv)).toBe(false);
  });

  it('is ready when EMAIL_PROVIDER=resend has both RESEND_API_KEY and EMAIL_FROM', () => {
    const env = loadEnv({ NODE_ENV: 'test', APP_PUBLIC_URL: 'http://localhost:3000' });
    const readyEnv = { ...env, emailProvider: 'resend' as const, resendApiKey: 'key', emailFrom: 'Servora <noreply@example.com>' };
    expect(isReady(readyEnv)).toBe(true);
  });
});
