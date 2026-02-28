import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleBuildEvent } from '../lib/build-event-handler.js';
import type { BuildEvent } from '../lib/build-events.js';

/**
 * Tests for the build-event handler logic.
 * We test handleBuildEvent() directly rather than the Vercel wrapper,
 * injecting a mock Octokit to avoid real GitHub API calls.
 */

interface MockOctokit {
  rest: {
    issues: {
      createComment: ReturnType<typeof vi.fn>;
      addAssignees: ReturnType<typeof vi.fn>;
      removeAssignees: ReturnType<typeof vi.fn>;
    };
    pulls: {
      createReviewComment: ReturnType<typeof vi.fn>;
      createReply: ReturnType<typeof vi.fn>;
    };
  };
}

function makeMockOctokit(): MockOctokit {
  return {
    rest: {
      issues: {
        createComment: vi.fn().mockResolvedValue({ data: { id: 1 } }),
        addAssignees: vi.fn().mockResolvedValue({}),
        removeAssignees: vi.fn().mockResolvedValue({}),
      },
      pulls: {
        createReviewComment: vi.fn().mockResolvedValue({}),
        createReply: vi.fn().mockResolvedValue({}),
      },
    },
  };
}

describe('handleBuildEvent — build_start', () => {
  let octokit: MockOctokit;

  beforeEach(() => {
    octokit = makeMockOctokit();
  });

  it('posts a build-start comment on the issue', async () => {
    const event: BuildEvent = {
      type: 'build_start',
      owner: 'epik-agent',
      repo: 'myrepo',
      issueNumber: 10,
      installationId: 999,
      acceptanceCriteria: ['Add CI', 'Add tests'],
    };

    await handleBuildEvent(event, octokit as never);

    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const call = octokit.rest.issues.createComment.mock.calls[0] as [
      { owner: string; repo: string; issue_number: number; body: string },
    ];
    expect(call[0].owner).toBe('epik-agent');
    expect(call[0].repo).toBe('myrepo');
    expect(call[0].issue_number).toBe(10);
    expect(call[0].body).toContain('Starting implementation');
    expect(call[0].body).toContain('Add CI');
    expect(call[0].body).toContain('Add tests');
  });

  it('assigns @epik-agent to the issue when build starts', async () => {
    const event: BuildEvent = {
      type: 'build_start',
      owner: 'epik-agent',
      repo: 'myrepo',
      issueNumber: 10,
      installationId: 999,
      acceptanceCriteria: [],
    };

    await handleBuildEvent(event, octokit as never);

    expect(octokit.rest.issues.addAssignees).toHaveBeenCalledOnce();
    const call = octokit.rest.issues.addAssignees.mock.calls[0] as [
      { owner: string; repo: string; issue_number: number; assignees: string[] },
    ];
    expect(call[0].assignees).toContain('epik-agent');
    expect(call[0].issue_number).toBe(10);
  });
});

describe('handleBuildEvent — pr_created', () => {
  let octokit: MockOctokit;

  beforeEach(() => {
    octokit = makeMockOctokit();
  });

  it('posts a PR summary comment on the issue', async () => {
    const event: BuildEvent = {
      type: 'pr_created',
      owner: 'epik-agent',
      repo: 'myrepo',
      issueNumber: 10,
      installationId: 999,
      prNumber: 42,
      prUrl: 'https://github.com/epik-agent/myrepo/pull/42',
    };

    await handleBuildEvent(event, octokit as never);

    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const call = octokit.rest.issues.createComment.mock.calls[0] as [
      { owner: string; repo: string; issue_number: number; body: string },
    ];
    expect(call[0].issue_number).toBe(10);
    expect(call[0].body).toContain('#42');
    expect(call[0].body).toContain('https://github.com/epik-agent/myrepo/pull/42');
  });
});

describe('handleBuildEvent — feature_complete', () => {
  let octokit: MockOctokit;

  beforeEach(() => {
    octokit = makeMockOctokit();
  });

  it('comments on all issues in the feature', async () => {
    const event: BuildEvent = {
      type: 'feature_complete',
      owner: 'epik-agent',
      repo: 'myrepo',
      issueNumbers: [1, 2, 3],
      installationId: 999,
      totalIssues: 3,
    };

    await handleBuildEvent(event, octokit as never);

    expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(3);
  });

  it('unassigns @epik-agent from all issues', async () => {
    const event: BuildEvent = {
      type: 'feature_complete',
      owner: 'epik-agent',
      repo: 'myrepo',
      issueNumbers: [5, 6],
      installationId: 999,
      totalIssues: 2,
    };

    await handleBuildEvent(event, octokit as never);

    expect(octokit.rest.issues.removeAssignees).toHaveBeenCalledTimes(2);
    const call = octokit.rest.issues.removeAssignees.mock.calls[0] as [{ assignees: string[] }];
    expect(call[0].assignees).toContain('epik-agent');
  });

  it('comment body mentions feature complete and issue count', async () => {
    const event: BuildEvent = {
      type: 'feature_complete',
      owner: 'epik-agent',
      repo: 'myrepo',
      issueNumbers: [7],
      installationId: 999,
      totalIssues: 1,
    };

    await handleBuildEvent(event, octokit as never);

    const call = octokit.rest.issues.createComment.mock.calls[0] as [{ body: string }];
    expect(call[0].body).toMatch(/feature complete/i);
    expect(call[0].body).toContain('1');
  });
});

describe('handleBuildEvent — build_failed', () => {
  let octokit: MockOctokit;

  beforeEach(() => {
    octokit = makeMockOctokit();
  });

  it('posts a failure comment on the issue', async () => {
    const event: BuildEvent = {
      type: 'build_failed',
      owner: 'epik-agent',
      repo: 'myrepo',
      issueNumber: 15,
      installationId: 999,
      reason: 'CI failed: 2 tests failed',
    };

    await handleBuildEvent(event, octokit as never);

    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const call = octokit.rest.issues.createComment.mock.calls[0] as [
      { issue_number: number; body: string },
    ];
    expect(call[0].issue_number).toBe(15);
    expect(call[0].body).toContain('CI failed: 2 tests failed');
  });

  it('unassigns @epik-agent from the issue on failure', async () => {
    const event: BuildEvent = {
      type: 'build_failed',
      owner: 'epik-agent',
      repo: 'myrepo',
      issueNumber: 15,
      installationId: 999,
      reason: 'timeout',
    };

    await handleBuildEvent(event, octokit as never);

    expect(octokit.rest.issues.removeAssignees).toHaveBeenCalledOnce();
    const call = octokit.rest.issues.removeAssignees.mock.calls[0] as [{ assignees: string[] }];
    expect(call[0].assignees).toContain('epik-agent');
  });
});
