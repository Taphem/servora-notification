import type { FastifyBaseLogger } from 'fastify';
import { Resend } from 'resend';
import { ProviderError } from '../../errors/ProviderError.js';
import type { EmailProvider, SendEmailInput } from './EmailProvider.js';

export interface ResendEmailProviderOptions {
  apiKey: string;
  from: string;
}

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;
  private readonly from: string;

  constructor(options: ResendEmailProviderOptions) {
    this.client = new Resend(options.apiKey);
    this.from = options.from;
  }

  async sendEmail(input: SendEmailInput, logger: FastifyBaseLogger): Promise<void> {
    let result: Awaited<ReturnType<Resend['emails']['send']>>;

    try {
      result = await this.client.emails.send({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
    } catch (error) {
      logger.error({ type: input.type, err: error instanceof Error ? error.message : 'unknown error' }, 'resend request failed');
      throw new ProviderError('email', 'Email provider request failed.', error);
    }

    if (result.error) {
      logger.error({ type: input.type, providerErrorName: result.error.name }, 'resend rejected email');
      throw new ProviderError('email', `Email provider rejected the request: ${result.error.name}`);
    }
  }
}
