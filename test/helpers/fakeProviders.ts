import type { FastifyBaseLogger } from 'fastify';
import { ProviderError } from '../../src/errors/ProviderError.js';
import type { EmailProvider, SendEmailInput } from '../../src/providers/email/EmailProvider.js';
import type { SendSmsInput, SmsProvider } from '../../src/providers/sms/SmsProvider.js';

export class FakeEmailProvider implements EmailProvider {
  calls: SendEmailInput[] = [];
  shouldFail = false;

  async sendEmail(input: SendEmailInput, _logger: FastifyBaseLogger): Promise<void> {
    if (this.shouldFail) {
      throw new ProviderError('email', 'simulated failure');
    }
    this.calls.push(input);
  }
}

export class FakeSmsProvider implements SmsProvider {
  calls: SendSmsInput[] = [];
  shouldFail = false;

  async sendSms(input: SendSmsInput, _logger: FastifyBaseLogger): Promise<void> {
    if (this.shouldFail) {
      throw new ProviderError('sms', 'simulated failure');
    }
    this.calls.push(input);
  }
}
