import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Fastify's genReqId hook — reuses a well-formed inbound x-request-id
 * (e.g. forwarded by an upstream caller) so the ID is stable across
 * services, otherwise generates a fresh one. Available from the very
 * first log line, not just after a hook runs.
 */
export function genRequestId(request: FastifyRequest['raw']): string {
  const incoming = request.headers[REQUEST_ID_HEADER];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
}

export { REQUEST_ID_HEADER };
