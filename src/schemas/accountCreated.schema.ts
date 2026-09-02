import { z } from 'zod';
import { UUID_PATTERN } from './uuid.js';

export const accountCreatedSchema = z.object({
  userId: z.string().regex(UUID_PATTERN, 'userId must be a UUID'),
  email: z.string().email().max(320),
  authenticationMethod: z.enum(['password', 'google']),
  emailVerified: z.boolean(),
});

export type AccountCreatedRequest = z.infer<typeof accountCreatedSchema>;
