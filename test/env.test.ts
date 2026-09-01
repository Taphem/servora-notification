import { describe, expect, it } from 'vitest';
import { ConfigError, loadEnv } from '../src/config/env.js';

const BASE = {
  NODE_ENV: 'test',
  APP_PUBLIC_URL: 'http://localhost:3000',
};

describe('loadEnv', () => {
  it('defaults INTERNAL_SERVICE_KEY in the test environment', () => {
    const env = loadEnv(BASE);
    expect(env.internalServiceKey).toBe('test-internal-service-key');
  });

  it('requires INTERNAL_SERVICE_KEY outside the test environment', () => {
    expect(() => loadEnv({ ...BASE, NODE_ENV: 'development' })).toThrow(ConfigError);
  });

  it('requires RESEND_API_KEY when EMAIL_PROVIDER=resend', () => {
    expect(() =>
      loadEnv({ ...BASE, EMAIL_PROVIDER: 'resend', EMAIL_FROM: 'Servora <noreply@example.com>' }),
    ).toThrow(ConfigError);
  });

  it('requires EMAIL_FROM when EMAIL_PROVIDER=resend', () => {
    expect(() => loadEnv({ ...BASE, EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'key' })).toThrow(ConfigError);
  });

  it('accepts EMAIL_PROVIDER=resend with both RESEND_API_KEY and EMAIL_FROM set', () => {
    const env = loadEnv({
      ...BASE,
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'key',
      EMAIL_FROM: 'Servora <noreply@example.com>',
    });
    expect(env.emailProvider).toBe('resend');
  });

  it('does not require RESEND_API_KEY when EMAIL_PROVIDER=console', () => {
    const env = loadEnv({ ...BASE, EMAIL_PROVIDER: 'console' });
    expect(env.emailProvider).toBe('console');
  });

  it('rejects an invalid APP_PUBLIC_URL', () => {
    expect(() => loadEnv({ ...BASE, APP_PUBLIC_URL: 'not-a-url' })).toThrow(ConfigError);
  });
});
