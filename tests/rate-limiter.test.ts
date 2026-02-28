import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter } from '../lib/rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first call for a given key', () => {
    const limiter = new RateLimiter(5000);
    expect(limiter.isAllowed('key1')).toBe(true);
  });

  it('blocks a second call within the window', () => {
    const limiter = new RateLimiter(5000);
    limiter.isAllowed('key1');
    expect(limiter.isAllowed('key1')).toBe(false);
  });

  it('allows a call after the window expires', () => {
    const limiter = new RateLimiter(5000);
    limiter.isAllowed('key1');
    vi.advanceTimersByTime(5001);
    expect(limiter.isAllowed('key1')).toBe(true);
  });

  it('tracks different keys independently', () => {
    const limiter = new RateLimiter(5000);
    limiter.isAllowed('key1');
    expect(limiter.isAllowed('key2')).toBe(true);
  });

  it('still blocks within the exact window boundary', () => {
    const limiter = new RateLimiter(5000);
    limiter.isAllowed('key1');
    vi.advanceTimersByTime(4999);
    expect(limiter.isAllowed('key1')).toBe(false);
  });
});
