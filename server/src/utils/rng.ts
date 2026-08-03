import crypto from 'crypto';

/**
 * Returns a cryptographically secure random integer in [0, maxExclusive).
 * Uses rejection sampling to avoid modulo bias.
 */
export function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error('maxExclusive must be positive');
  const range = maxExclusive;
  const bitsNeeded = Math.ceil(Math.log2(range));
  const bytesNeeded = Math.max(1, Math.ceil(bitsNeeded / 8));
  const maxValue = 2 ** (bytesNeeded * 8);
  const limit = maxValue - (maxValue % range);

  let value: number;
  do {
    const buf = crypto.randomBytes(bytesNeeded);
    value = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      value = value * 256 + buf[i];
    }
  } while (value >= limit);

  return value % range;
}

/** Fisher-Yates shuffle using a cryptographically secure RNG. Mutates and returns the array. */
export function secureShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += alphabet[secureRandomInt(alphabet.length)];
  }
  return code;
}

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generates a random URL-safe ID of the given length using a CSPRNG.
 * A small in-house replacement for nanoid — nanoid v5+ ships ESM-only, which
 * breaks `require()` from this project's CommonJS build output.
 */
export function generateId(length = 12): string {
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ID_ALPHABET[secureRandomInt(ID_ALPHABET.length)];
  }
  return id;
}
