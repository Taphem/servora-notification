import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers/buildTestApp.js';

describe('health and readiness', () => {
  it('GET /health returns 200 { status: ok }', async () => {
    const { app } = buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('GET /ready returns 200 { status: ready } when configuration is valid', async () => {
    const { app } = buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ready' });
  });
});
