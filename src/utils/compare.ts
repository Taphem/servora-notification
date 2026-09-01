import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison. Hashing both sides first normalizes
 * length before timingSafeEqual, which throws on mismatched buffer lengths.
 */
export function secureCompare(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
