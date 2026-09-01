import { z } from 'zod';

const DEV_TEST_INTERNAL_SERVICE_KEY = 'test-internal-service-key';

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4009),
  HOST: z.string().min(1).default('0.0.0.0'),

  INTERNAL_SERVICE_KEY: z.string().optional(),

  APP_PUBLIC_URL: z.string().url(),

  EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  SMS_PROVIDER: z.enum(['console']).default('console'),
});

export type Env = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  host: string;
  internalServiceKey: string;
  appPublicUrl: string;
  emailProvider: 'console' | 'resend';
  resendApiKey: string | undefined;
  emailFrom: string | undefined;
  smsProvider: 'console';
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = rawEnvSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new ConfigError(`Invalid environment configuration: ${issues}`);
  }

  const data = parsed.data;

  let internalServiceKey = data.INTERNAL_SERVICE_KEY;
  if (!internalServiceKey) {
    if (data.NODE_ENV === 'test') {
      internalServiceKey = DEV_TEST_INTERNAL_SERVICE_KEY;
    } else {
      throw new ConfigError('INTERNAL_SERVICE_KEY is required outside of the test environment.');
    }
  }

  if (data.EMAIL_PROVIDER === 'resend') {
    if (!data.RESEND_API_KEY) {
      throw new ConfigError('RESEND_API_KEY is required when EMAIL_PROVIDER=resend.');
    }
    if (!data.EMAIL_FROM) {
      throw new ConfigError('EMAIL_FROM is required when EMAIL_PROVIDER=resend.');
    }
  }

  return {
    nodeEnv: data.NODE_ENV,
    port: data.PORT,
    host: data.HOST,
    internalServiceKey,
    appPublicUrl: data.APP_PUBLIC_URL,
    emailProvider: data.EMAIL_PROVIDER,
    resendApiKey: data.RESEND_API_KEY,
    emailFrom: data.EMAIL_FROM,
    smsProvider: data.SMS_PROVIDER,
  };
}
