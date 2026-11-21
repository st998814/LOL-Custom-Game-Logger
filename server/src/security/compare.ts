import crypto from 'node:crypto';

/** Constant-time string compare; unequal lengths are not equal. */
function secureCompare(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export { secureCompare };
