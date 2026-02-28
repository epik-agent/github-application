import type { Octokit } from '@octokit/core';
import type { MentionCommand } from './mention-parser.js';

interface CommandContext {
  readonly owner: string;
  readonly repo: string;
  readonly issueNumber: number;
}

type RestOctokit = Octokit & {
  rest: {
    issues: {
      createComment: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        body: string;
      }) => Promise<unknown>;
      get: (params: { owner: string; repo: string; issue_number: number }) => Promise<{
        data: {
          state: string;
          title: string;
          pull_request?: unknown;
        };
      }>;
    };
  };
};

const HELP_TEXT = [
  `**@epik[bot] commands:**`,
  ``,
  `- \`@epik[bot] status\` — show build status for this repo`,
  `- \`@epik[bot] status #N\` — show status of a specific issue`,
  `- \`@epik[bot] help\` — show this message`,
].join('\n');

/**
 * Dispatches a parsed mention command and posts a response comment.
 * Accepts an injected Octokit for testability.
 */
export async function handleMentionCommand(
  command: MentionCommand,
  ctx: CommandContext,
  octokit: RestOctokit,
): Promise<void> {
  switch (command.type) {
    case 'status': {
      const body =
        command.issueNumber === null
          ? repoStatusBody()
          : await issueStatusBody(command.issueNumber, ctx, octokit);

      await octokit.rest.issues.createComment({
        owner: ctx.owner,
        repo: ctx.repo,
        issue_number: ctx.issueNumber,
        body,
      });
      break;
    }

    case 'help': {
      await octokit.rest.issues.createComment({
        owner: ctx.owner,
        repo: ctx.repo,
        issue_number: ctx.issueNumber,
        body: HELP_TEXT,
      });
      break;
    }

    case 'unknown': {
      await octokit.rest.issues.createComment({
        owner: ctx.owner,
        repo: ctx.repo,
        issue_number: ctx.issueNumber,
        body: [`Unknown command: \`${command.raw}\``, ``, HELP_TEXT].join('\n'),
      });
      break;
    }
  }
}

function repoStatusBody(): string {
  // Without a persistent store, we can only report that no active builds are
  // tracked in this serverless instance. A future version will query a store.
  return [
    `**Build status** — no active builds tracked in this instance.`,
    ``,
    `> 💡 Build tracking requires a persistent store integration (coming soon).`,
    `> For now, check the GitHub Actions tab or project board for current status.`,
  ].join('\n');
}

async function issueStatusBody(
  targetIssueNumber: number,
  ctx: CommandContext,
  octokit: RestOctokit,
): Promise<string> {
  const { data: issue } = await octokit.rest.issues.get({
    owner: ctx.owner,
    repo: ctx.repo,
    issue_number: targetIssueNumber,
  });

  const stateLabel = issue.state === 'closed' ? '✅ closed / done' : '🔵 open';

  return [
    `**Status of #${String(targetIssueNumber)}: ${issue.title}**`,
    ``,
    `- State: ${stateLabel}`,
  ].join('\n');
}
