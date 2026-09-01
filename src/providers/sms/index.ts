import type { Env } from '../../config/env.js';
import { ConsoleSmsProvider } from './ConsoleSmsProvider.js';
import type { SmsProvider } from './SmsProvider.js';

export function createSmsProvider(_env: Env): SmsProvider {
  return new ConsoleSmsProvider();
}

export type { SmsProvider, SendSmsInput } from './SmsProvider.js';
