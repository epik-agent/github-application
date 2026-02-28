import type { App } from '@octokit/app';
import { parseMentionCommand } from './mention-parser.js';
import { handleMentionCommand } from './command-responses.js';
import { rateLimiter } from './rate-limiter.js';

/**
 * Register all webhook event handlers on the app.
 * Separated from the App construction so handlers are easy to find and extend.
 */
export function registerHandlers(app: App): void {
  app.webhooks.on('issue_comment.created', async ({ octokit, payload }) => {
    const comment = payload.comment;
    const issue = payload.issue;
    const repo = payload.repository;

    // Only respond to comments that mention @epik (case-insensitive)
    if (!comment.body.toLowerCase().includes('@epik')) return;

    // Don't respond to our own comments
    const appId = process.env.APP_ID;
    if (comment.performed_via_github_app?.id === Number(appId)) return;

    // Rate-limit: one response per issue per 30 seconds
    const rateLimitKey = `${repo.full_name}#${String(issue.number)}`;
    if (!rateLimiter.isAllowed(rateLimitKey)) {
      // eslint-disable-next-line no-console
      console.log(`[epik] Rate-limited response for ${rateLimitKey}`);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[epik] Mentioned in ${repo.full_name}#${String(issue.number)}: "${comment.body.slice(0, 80)}"`,
    );

    const command = parseMentionCommand(comment.body);

    if (command === null) {
      // Conversational mention — no command detected, do not respond
      return;
    }

    await handleMentionCommand(
      command,
      { owner: repo.owner.login, repo: repo.name, issueNumber: issue.number },
      octokit,
    );
  });

  app.webhooks.on('issues.opened', ({ payload }) => {
    const issue = payload.issue;
    const repo = payload.repository;

    // eslint-disable-next-line no-console
    console.log(`[epik] New issue in ${repo.full_name}#${String(issue.number)}: "${issue.title}"`);

    // Future: planning agent picks this up
  });

  app.webhooks.on('pull_request', ({ payload }) => {
    const pr = payload.pull_request;
    const repo = payload.repository;

    // eslint-disable-next-line no-console
    console.log(`[epik] PR event in ${repo.full_name}#${String(pr.number)}: "${pr.title}"`);

    // Future: CI liaison, build status updates
  });

  app.webhooks.onError((error) => {
    // eslint-disable-next-line no-console
    console.error('[epik] Webhook error:', error.message);
  });
}
