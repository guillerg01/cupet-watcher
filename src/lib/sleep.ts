/**
 * Resolves after `ms` milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a random integer in [min, max] (inclusive on both ends).
 */
export function jitter(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
