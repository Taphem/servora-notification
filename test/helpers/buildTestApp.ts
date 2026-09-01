import { Writable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import pino from 'pino';
import { buildApp } from '../../src/app.js';
import { loadEnv } from '../../src/config/env.js';
import { FakeEmailProvider, FakeSmsProvider } from './fakeProviders.js';

export const TEST_INTERNAL_SERVICE_KEY = 'test-internal-service-key';

function createCapturingLogger(): { logger: pino.Logger; lines: Record<string, unknown>[] } {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      callback();
    },
  });
  const logger = pino({ level: 'info' }, stream);
  return { logger, lines };
}

export function buildTestApp(options: { capture?: boolean } = {}): {
  app: FastifyInstance;
  emailProvider: FakeEmailProvider;
  smsProvider: FakeSmsProvider;
  logLines: Record<string, unknown>[];
} {
  const env = loadEnv({
    NODE_ENV: 'test',
    INTERNAL_SERVICE_KEY: TEST_INTERNAL_SERVICE_KEY,
    APP_PUBLIC_URL: 'http://localhost:3000',
    EMAIL_PROVIDER: 'console',
    SMS_PROVIDER: 'console',
  });

  const emailProvider = new FakeEmailProvider();
  const smsProvider = new FakeSmsProvider();

  const capture = options.capture ? createCapturingLogger() : undefined;

  const app = buildApp({
    env,
    emailProvider,
    smsProvider,
    loggerInstance: capture?.logger,
  });

  return { app, emailProvider, smsProvider, logLines: capture?.lines ?? [] };
}

export const VALID_USER_ID = '00000000-0000-0000-0000-000000000001';
