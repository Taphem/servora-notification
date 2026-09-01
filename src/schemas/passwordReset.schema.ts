import { z } from 'zod';
import { UUID_PATTERN } from './uuid.js';

export const passwordResetSchema = z.object({
  userId: z.string().regex(UUID_PATTERN, 'userId must be a UUID'),
  email: z.string().email().max(320),
  resetToken: z.string().min(1).max(1024),
});

export type PasswordResetRequest = z.infer<typeof passwordResetSchema>;
