import { describe, it, expect } from 'vitest';
import handler from '../api/health.js';

/**
 * Tests for the health check endpoint.
 */

interface MockResponse {
  _statusCode: number;
  _body: unknown;
  status: (code: number) => MockResponse;
  json: (body: unknown) => void;
}

function makeMockRes(): MockResponse {
  const res: MockResponse = {
    _statusCode: 0,
    _body: undefined,
    status(code: number): MockResponse {
      res._statusCode = code;
      return res;
    },
    json(body: unknown): void {
      res._body = body;
    },
  };
  return res;
}

describe('GET /api/health', () => {
  it('returns 200 with status ok', () => {
    const res = makeMockRes();
    handler({} as never, res as never);

    expect(res._statusCode).toBe(200);
  });

  it('returns JSON with status: ok and service: epik-bot', () => {
    const res = makeMockRes();
    handler({} as never, res as never);

    expect(res._body).toEqual({ status: 'ok', service: 'epik-bot' });
  });
});
