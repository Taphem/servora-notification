import { z } from 'zod';
import { UUID_PATTERN } from './uuid.js';

export const emailVerificationSchema = z.object({
  userId: z.string().regex(UUID_PATTERN, 'userId must be a UUID'),
  email: z.string().email().max(320),
  verificationToken: z.string().min(1).max(1024),
});

export type EmailVerificationRequest = z.infer<typeof emailVerificationSchema>;
