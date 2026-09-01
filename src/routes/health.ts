import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';

export interface HealthRoutesOptions {
  env: Env;
}

export default async function healthRoutes(app: FastifyInstance, options: HealthRoutesOptions): Promise<void> {
  app.get('/health', async (_request, reply) => {
    reply.status(200).send({ status: 'ok' });
  });

  app.get('/ready', async (_request, reply) => {
    const ready = isReady(options.env);
    reply.status(ready ? 200 : 503).send({ status: ready ? 'ready' : 'not_ready' });
  });
}

export function isReady(env: Env): boolean {
  if (!env.internalServiceKey) {
    return false;
  }

  if (env.emailProvider === 'resend' && (!env.resendApiKey || !env.emailFrom)) {
    return false;
  }

  return true;
}
