import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { EmitterWebhookEventName } from '@octokit/webhooks';
import { getApp } from '../lib/epik.js';
import { registerHandlers } from '../lib/handlers.js';
import { validateWebhookRequest } from '../lib/validate-request.js';

/**
 * POST /api/webhook
 *
 * GitHub sends all webhook events here. Vercel routes it to this
 * serverless function automatically via the api/ directory convention.
 */

let app: ReturnType<typeof getApp>;
let initError: Error | null = null;
try {
  app = getApp();
  registerHandlers(app);
} catch (e: unknown) {
  initError = e instanceof Error ? e : new Error(String(e));
  // eslint-disable-next-line no-console
  console.error('[epik] Failed to initialise app:', initError.message);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (initError ?? !app) {
    res.status(500).json({ error: 'App init failed', detail: initError?.message });
    return;
  }
  const validationError = validateWebhookRequest(
    req.method ?? '',
    req.headers as Record<string, string | string[] | undefined>,
  );

  if (validationError) {
    res.status(validationError.status).send(validationError.error);
    return;
  }

  const id = req.headers['x-github-delivery'] as string;
  const name = req.headers['x-github-event'] as string;
  const signature = req.headers['x-hub-signature-256'] as string;

  // Vercel parses JSON bodies automatically, but octokit wants the raw string
  // for signature verification. Stringify it back.
  const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  try {
    await app.webhooks.verifyAndReceive({
      id,
      name: name as EmitterWebhookEventName,
      signature,
      payload,
    });

    res.status(200).send('ok');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('[epik] Webhook verification/handling failed:', message);
    res.status(400).send(message);
  }
}
