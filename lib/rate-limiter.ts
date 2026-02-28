/**
 * In-memory rate limiter to prevent @epik[bot] from spamming replies.
 *
 * Tracks the last response time per key (e.g. "<owner>/<repo>#<issue>").
 * If a key was seen within the window, the call is rejected.
 * The store is module-level so it persists across warm Vercel invocations.
 */
export class RateLimiter {
  private readonly windowMs: number;
  private readonly lastSeen = new Map<string, number>();

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  /**
   * Returns true if the key is allowed (not rate-limited), and records the
   * current timestamp. Returns false if the key is within the cooldown window.
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const last = this.lastSeen.get(key);

    if (last !== undefined && now - last < this.windowMs) {
      return false;
    }

    this.lastSeen.set(key, now);
    return true;
  }
}

/** Singleton rate limiter: 30-second cooldown per issue/comment thread. */
export const rateLimiter = new RateLimiter(30_000);
