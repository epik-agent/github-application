import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/health
 *
 * Smoke-test endpoint. Returns 200 OK with a JSON status object.
 * Used to verify the Vercel deployment is live and routing correctly.
 */
export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.status(200).json({ status: 'ok', service: 'epik-bot' });
}
