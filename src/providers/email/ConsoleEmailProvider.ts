import type { FastifyBaseLogger } from 'fastify';
import type { EmailProvider, SendEmailInput } from './EmailProvider.js';

/**
 * Development-safe email provider. Simulates delivery by logging only
 * non-sensitive metadata — never the HTML/text body, which is the only
 * place the verification/reset URL (and therefore the raw token) appears.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(input: SendEmailInput, logger: FastifyBaseLogger): Promise<void> {
    logger.info(
      { type: input.type, recipient: input.to, subject: input.subject },
      'Email notification accepted (console provider)',
    );
  }
}
