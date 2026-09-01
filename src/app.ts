import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import type { Env } from './config/env.js';
import errorHandlerPlugin from './middleware/errorHandler.js';
import { INTERNAL_SERVICE_KEY_HEADER } from './middleware/internalAuth.js';
import { genRequestId, REQUEST_ID_HEADER } from './middleware/requestId.js';
import { createEmailProvider } from './providers/email/index.js';
import type { EmailProvider } from './providers/email/EmailProvider.js';
import { createSmsProvider } from './providers/sms/index.js';
import type { SmsProvider } from './providers/sms/SmsProvider.js';
import healthRoutes from './routes/health.js';
import notificationRoutes from './routes/notifications.js';
import { NotificationService } from './services/notificationService.js';

export interface BuildAppOptions {
  env: Env;
  emailProvider?: EmailProvider;
  smsProvider?: SmsProvider;
  /** Injectable pino-compatible logger, used by tests to capture log output. */
  loggerInstance?: FastifyBaseLogger;
}

const REDACT_PATHS = [`req.headers["${INTERNAL_SERVICE_KEY_HEADER}"]`, 'req.headers.authorization', 'req.headers.cookie'];

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = options.loggerInstance
    ? Fastify({ genReqId: genRequestId, bodyLimit: 16 * 1024, loggerInstance: options.loggerInstance })
    : Fastify({
        genReqId: genRequestId,
        bodyLimit: 16 * 1024,
        logger: {
          level: options.env.nodeEnv === 'test' ? 'silent' : 'info',
          redact: {
            paths: REDACT_PATHS,
            censor: '[redacted]',
          },
        },
      });

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header(REQUEST_ID_HEADER, request.id);
    return payload;
  });

  const emailProvider = options.emailProvider ?? createEmailProvider(options.env);
  const smsProvider = options.smsProvider ?? createSmsProvider(options.env);

  const notificationService = new NotificationService({
    emailProvider,
    smsProvider,
    appPublicUrl: options.env.appPublicUrl,
  });

  void app.register(errorHandlerPlugin);
  void app.register(healthRoutes, { env: options.env });
  void app.register(notificationRoutes, {
    notificationService,
    internalServiceKey: options.env.internalServiceKey,
  });

  return app;
}
