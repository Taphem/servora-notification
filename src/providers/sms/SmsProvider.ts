import type { FastifyBaseLogger } from 'fastify';

export interface SendSmsInput {
  type: 'phone-otp';
  to: string;
  body: string;
}

export interface SmsProvider {
  sendSms(input: SendSmsInput, logger: FastifyBaseLogger): Promise<void>;
}
