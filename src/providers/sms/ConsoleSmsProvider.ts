import type { FastifyBaseLogger } from 'fastify';
import type { SendSmsInput, SmsProvider } from './SmsProvider.js';

/**
 * Development-safe SMS provider. Simulates delivery by logging only the
 * recipient and notification type — never `body`, which contains the raw
 * OTP supplied by Auth.
 */
export class ConsoleSmsProvider implements SmsProvider {
  async sendSms(input: SendSmsInput, logger: FastifyBaseLogger): Promise<void> {
    logger.info({ type: input.type, recipient: input.to }, 'SMS notification accepted (console provider)');
  }
}
