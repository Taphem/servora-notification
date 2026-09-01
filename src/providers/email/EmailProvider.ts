import type { FastifyBaseLogger } from 'fastify';

export type EmailNotificationType = 'email-verification' | 'password-reset';

export interface SendEmailInput {
  type: EmailNotificationType;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  sendEmail(input: SendEmailInput, logger: FastifyBaseLogger): Promise<void>;
}
