import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Octokit } from '@octokit/core';
import { getApp } from '../lib/epik.js';
import { handleBuildEvent } from '../lib/build-event-handler.js';
import type { BuildEvent } from '../lib/build-events.js';

/**
 * POST /api/build-event
 *
 * Local Epik calls this endpoint to notify the GitHub App of build lifecycle
 * events. The GitHub App then posts comments and manages assignees on the
 * relevant issues and PRs.
 *
 * Request body: JSON matching the BuildEvent discriminated union.
 *
 * Authentication: caller must supply the correct WEBHOOK_SECRET as a Bearer
 * token in the Authorization header. This prevents arbitrary callers from
 * posting comments on GitHub.
 */

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  // Authenticate the caller using the shared WEBHOOK_SECRET
  const authHeader = req.headers.authorization;
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    res.status(401).send('Unauthorized');
    return;
  }

  const event = req.body as Record<string, unknown>;

  if (typeof event.type !== 'string') {
    res.status(400).send('Missing event type');
    return;
  }

  try {
    const app = getApp();
    const octokit = (await app.getInstallationOctokit(
      event.installationId as number,
    )) as Octokit & {
      rest: {
        issues: {
          createComment: (params: unknown) => Promise<unknown>;
          addAssignees: (params: unknown) => Promise<unknown>;
          removeAssignees: (params: unknown) => Promise<unknown>;
        };
      };
    };

    await handleBuildEvent(event as unknown as BuildEvent, octokit as never);
    res.status(200).json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('[epik] Build event handling failed:', message);
    res.status(500).send(message);
  }
}
