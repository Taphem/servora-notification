import { z } from 'zod';
import { UUID_PATTERN } from './uuid.js';

const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export const phoneOtpSchema = z.object({
  userId: z.string().regex(UUID_PATTERN, 'userId must be a UUID'),
  phone: z.string().regex(E164_PATTERN, 'phone must be in E.164 format'),
  otp: z.string().min(4).max(10),
  expiresInSeconds: z.number().int().positive(),
});

export type PhoneOtpRequest = z.infer<typeof phoneOtpSchema>;
