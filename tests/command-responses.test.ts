import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMentionCommand } from '../lib/command-responses.js';
import type { MentionCommand } from '../lib/mention-parser.js';

interface MockOctokit {
  rest: {
    issues: {
      createComment: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
    };
  };
}

function makeMockOctokit(issueState = 'open'): MockOctokit {
  return {
    rest: {
      issues: {
        createComment: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({
          data: {
            state: issueState,
            pull_request: undefined,
            title: 'Test issue',
          },
        }),
      },
    },
  };
}

const baseParams = { owner: 'epik-agent', repo: 'myrepo', issueNumber: 1 };

describe('handleMentionCommand — status (repo-wide)', () => {
  let octokit: MockOctokit;

  beforeEach(() => {
    octokit = makeMockOctokit();
  });

  it('replies with no-active-builds message when no issue number given', async () => {
    const command: MentionCommand = { type: 'status', issueNumber: null };
    await handleMentionCommand(command, baseParams, octokit as never);

    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const body = (octokit.rest.issues.createComment.mock.calls[0] as [{ body: string }])[0].body;
    expect(body).toMatch(/no active builds|build status/i);
  });
});

describe('handleMentionCommand — status #N', () => {
  it('replies with issue status for a specific issue number', async () => {
    const octokit = makeMockOctokit('open');
    const command: MentionCommand = { type: 'status', issueNumber: 42 };
    await handleMentionCommand(command, baseParams, octokit as never);

    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const body = (octokit.rest.issues.createComment.mock.calls[0] as [{ body: string }])[0].body;
    expect(body).toContain('42');
  });

  it('mentions "open" when issue is open', async () => {
    const octokit = makeMockOctokit('open');
    const command: MentionCommand = { type: 'status', issueNumber: 5 };
    await handleMentionCommand(command, baseParams, octokit as never);

    const body = (octokit.rest.issues.createComment.mock.calls[0] as [{ body: string }])[0].body;
    expect(body).toMatch(/open|todo|in progress/i);
  });

  it('mentions "closed" or "done" when issue is closed', async () => {
    const octokit = makeMockOctokit('closed');
    const command: MentionCommand = { type: 'status', issueNumber: 7 };
    await handleMentionCommand(command, baseParams, octokit as never);

    const body = (octokit.rest.issues.createComment.mock.calls[0] as [{ body: string }])[0].body;
    expect(body).toMatch(/closed|done|merged/i);
  });
});

describe('handleMentionCommand — help', () => {
  it('replies with available commands list', async () => {
    const octokit = makeMockOctokit();
    const command: MentionCommand = { type: 'help' };
    await handleMentionCommand(command, baseParams, octokit as never);

    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const body = (octokit.rest.issues.createComment.mock.calls[0] as [{ body: string }])[0].body;
    expect(body).toContain('status');
    expect(body).toContain('help');
  });
});

describe('handleMentionCommand — unknown', () => {
  it('replies with a helpful unknown-command message', async () => {
    const octokit = makeMockOctokit();
    const command: MentionCommand = { type: 'unknown', raw: 'foobar' };
    await handleMentionCommand(command, baseParams, octokit as never);

    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const body = (octokit.rest.issues.createComment.mock.calls[0] as [{ body: string }])[0].body;
    // Should include the unknown command and list of valid commands
    expect(body).toContain('foobar');
    expect(body).toContain('status');
  });
});
