import type { Env } from '../../config/env.js';
import { ConsoleEmailProvider } from './ConsoleEmailProvider.js';
import type { EmailProvider } from './EmailProvider.js';
import { ResendEmailProvider } from './ResendEmailProvider.js';

export function createEmailProvider(env: Env): EmailProvider {
  if (env.emailProvider === 'resend') {
    if (!env.resendApiKey || !env.emailFrom) {
      throw new Error('RESEND_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=resend.');
    }
    return new ResendEmailProvider({ apiKey: env.resendApiKey, from: env.emailFrom });
  }

  return new ConsoleEmailProvider();
}

export type { EmailProvider, SendEmailInput, EmailNotificationType } from './EmailProvider.js';
