export type NotificationChannel = 'email' | 'sms';

/**
 * Raised by an EmailProvider/SmsProvider implementation when the underlying
 * delivery attempt fails. Never carries the raw provider exception/API key —
 * routes map this to a generic 502 PROVIDER_ERROR without leaking internals.
 */
export class ProviderError extends Error {
  readonly channel: NotificationChannel;

  constructor(channel: NotificationChannel, message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'ProviderError';
    this.channel = channel;
  }
}
