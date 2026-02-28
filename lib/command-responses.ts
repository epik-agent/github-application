import type { Octokit } from '@octokit/core';
import type { MentionCommand } from './mention-parser.js';

interface CommandContext {
  readonly owner: string;
  readonly repo: string;
  readonly issueNumber: number;
}

const HELP_TEXT = [
  `**@epik-agent commands:**`,
  ``,
  `- \`@epik-agent status\` — show build status for this repo`,
  `- \`@epik-agent status #N\` — show status of a specific issue`,
  `- \`@epik-agent help\` — show this message`,
].join('\n');

/**
 * Dispatches a parsed mention command and posts a response comment.
 * Accepts an injected Octokit for testability.
 */
export async function handleMentionCommand(
  command: MentionCommand,
  ctx: CommandContext,
  octokit: Octokit,
): Promise<void> {
  switch (command.type) {
    case 'status': {
      const body =
        command.issueNumber === null
          ? repoStatusBody()
          : await issueStatusBody(command.issueNumber, ctx, octokit);

      await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner: ctx.owner,
        repo: ctx.repo,
        issue_number: ctx.issueNumber,
        body,
      });
      break;
    }

    case 'help': {
      await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner: ctx.owner,
        repo: ctx.repo,
        issue_number: ctx.issueNumber,
        body: HELP_TEXT,
      });
      break;
    }

    case 'unknown': {
      await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
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
  octokit: Octokit,
): Promise<string> {
  const { data } = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
    owner: ctx.owner,
    repo: ctx.repo,
    issue_number: targetIssueNumber,
  });

  const issue = data as { state: string; title: string };
  const stateLabel = issue.state === 'closed' ? '✅ closed / done' : '🔵 open';

  return [
    `**Status of #${String(targetIssueNumber)}: ${issue.title}**`,
    ``,
    `- State: ${stateLabel}`,
  ].join('\n');
}
