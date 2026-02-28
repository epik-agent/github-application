import { describe, it, expect } from 'vitest';
import { validateWebhookRequest } from '../lib/validate-request.js';

/**
 * Tests for webhook request validation logic.
 */

describe('validateWebhookRequest', () => {
  it('rejects non-POST requests with 405', () => {
    const result = validateWebhookRequest('GET', {});
    expect(result).not.toBeNull();
    expect(result?.status).toBe(405);
    expect(result?.error).toMatch(/method not allowed/i);
  });

  it('rejects PUT requests with 405', () => {
    const result = validateWebhookRequest('PUT', {});
    expect(result).not.toBeNull();
    expect(result?.status).toBe(405);
  });

  it('rejects POST with missing delivery header with 400', () => {
    const result = validateWebhookRequest('POST', {
      'x-github-event': 'ping',
      'x-hub-signature-256': 'sha256=abc',
    });
    expect(result).not.toBeNull();
    expect(result?.status).toBe(400);
    expect(result?.error).toMatch(/missing/i);
  });

  it('rejects POST with missing event header with 400', () => {
    const result = validateWebhookRequest('POST', {
      'x-github-delivery': 'abc-123',
      'x-hub-signature-256': 'sha256=abc',
    });
    expect(result).not.toBeNull();
    expect(result?.status).toBe(400);
  });

  it('rejects POST with missing signature header with 400', () => {
    const result = validateWebhookRequest('POST', {
      'x-github-delivery': 'abc-123',
      'x-github-event': 'ping',
    });
    expect(result).not.toBeNull();
    expect(result?.status).toBe(400);
  });

  it('returns null (valid) for POST with all required headers', () => {
    const result = validateWebhookRequest('POST', {
      'x-github-delivery': 'abc-123',
      'x-github-event': 'ping',
      'x-hub-signature-256': 'sha256=validhash',
    });
    expect(result).toBeNull();
  });
});
