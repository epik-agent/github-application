import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMentionCommand } from '../lib/command-responses.js';
import type { MentionCommand } from '../lib/mention-parser.js';

interface MockOctokit {
  request: ReturnType<typeof vi.fn>;
}

function makeMockOctokit(issueState = 'open'): MockOctokit {
  return {
    request: vi.fn().mockImplementation((route: string) => {
      if (route.startsWith('GET')) {
        return Promise.resolve({ data: { state: issueState, title: 'Test issue' } });
      }
      return Promise.resolve({});
    }),
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

    expect(octokit.request).toHaveBeenCalledOnce();
    const body = (octokit.request.mock.calls[0] as [string, { body: string }])[1].body;
    expect(body).toMatch(/no active builds|build status/i);
  });
});

describe('handleMentionCommand — status #N', () => {
  it('replies with issue status for a specific issue number', async () => {
    const octokit = makeMockOctokit('open');
    const command: MentionCommand = { type: 'status', issueNumber: 42 };
    await handleMentionCommand(command, baseParams, octokit as never);

    // Two calls: GET issue + POST comment
    expect(octokit.request).toHaveBeenCalledTimes(2);
    const postCall = octokit.request.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).startsWith('POST'),
    ) as [string, { body: string }] | undefined;
    expect(postCall?.[1].body).toContain('42');
  });

  it('mentions "open" when issue is open', async () => {
    const octokit = makeMockOctokit('open');
    const command: MentionCommand = { type: 'status', issueNumber: 5 };
    await handleMentionCommand(command, baseParams, octokit as never);

    const postCall = octokit.request.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).startsWith('POST'),
    ) as [string, { body: string }] | undefined;
    expect(postCall?.[1].body).toMatch(/open|todo|in progress/i);
  });

  it('mentions "closed" or "done" when issue is closed', async () => {
    const octokit = makeMockOctokit('closed');
    const command: MentionCommand = { type: 'status', issueNumber: 7 };
    await handleMentionCommand(command, baseParams, octokit as never);

    const postCall = octokit.request.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).startsWith('POST'),
    ) as [string, { body: string }] | undefined;
    expect(postCall?.[1].body).toMatch(/closed|done|merged/i);
  });
});

describe('handleMentionCommand — help', () => {
  it('replies with available commands list', async () => {
    const octokit = makeMockOctokit();
    const command: MentionCommand = { type: 'help' };
    await handleMentionCommand(command, baseParams, octokit as never);

    expect(octokit.request).toHaveBeenCalledOnce();
    const body = (octokit.request.mock.calls[0] as [string, { body: string }])[1].body;
    expect(body).toContain('status');
    expect(body).toContain('help');
  });
});

describe('handleMentionCommand — unknown', () => {
  it('replies with a helpful unknown-command message', async () => {
    const octokit = makeMockOctokit();
    const command: MentionCommand = { type: 'unknown', raw: 'foobar' };
    await handleMentionCommand(command, baseParams, octokit as never);

    expect(octokit.request).toHaveBeenCalledOnce();
    const body = (octokit.request.mock.calls[0] as [string, { body: string }])[1].body;
    expect(body).toContain('foobar');
    expect(body).toContain('status');
  });
});
