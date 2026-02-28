import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { App } from '@octokit/app';
import { registerHandlers } from '../lib/handlers.js';

// Minimal mock types for webhook payloads
interface MockIssueCommentPayload {
  comment: { body: string; performed_via_github_app: { id: number } | null };
  issue: { number: number };
  repository: { full_name: string; owner: { login: string }; name: string };
}

interface MockIssuesPayload {
  issue: { number: number; title: string };
  repository: { full_name: string };
}

interface MockPullRequestPayload {
  pull_request: { number: number; title: string };
  repository: { full_name: string };
}

type HandlerFn = (event: unknown) => void | Promise<void>;

interface AppMock {
  app: App;
  handlers: Record<string, HandlerFn[]>;
  errorHandlers: ((e: { message: string }) => void)[];
}

/**
 * Minimal App mock that captures registered handlers.
 */
function makeAppMock(): AppMock {
  const handlers: Record<string, HandlerFn[]> = {};
  const errorHandlers: ((e: { message: string }) => void)[] = [];

  const app = {
    webhooks: {
      on(event: string, fn: HandlerFn): void {
        handlers[event] ??= [];
        handlers[event].push(fn);
      },
      onError(fn: (e: { message: string }) => void): void {
        errorHandlers.push(fn);
      },
    },
  } as unknown as App;

  return { app, handlers, errorHandlers };
}

/**
 * Gets the first registered handler for a given event.
 * Throws (as a test-time assertion) if no handler was registered.
 */
function getHandler(handlers: Record<string, HandlerFn[]>, event: string): HandlerFn {
  const list: HandlerFn[] = handlers[event] ?? [];
  if (list.length === 0) throw new Error(`No handler registered for: ${event}`);
  return list[0];
}

/** Standard octokit mock with request stub. */
function makeOctokit(): { request: ReturnType<typeof vi.fn> } {
  return {
    request: vi.fn().mockImplementation((route: string) => {
      if (route.startsWith('GET')) {
        return Promise.resolve({ data: { state: 'open', title: 'Test issue' } });
      }
      return Promise.resolve({});
    }),
  };
}

describe('registerHandlers', () => {
  describe('issue_comment.created', () => {
    it('replies to a recognized command (@epik help)', async () => {
      const { app, handlers } = makeAppMock();
      registerHandlers(app);

      const octokit = makeOctokit();
      const payload: MockIssueCommentPayload = {
        comment: { body: '@epik help', performed_via_github_app: null },
        issue: { number: 42 },
        repository: { full_name: 'epik-agent/test', owner: { login: 'epik-agent' }, name: 'test' },
      };

      await getHandler(handlers, 'issue_comment.created')({ octokit, payload });

      expect(octokit.request).toHaveBeenCalledOnce();
      expect(octokit.request).toHaveBeenCalledWith(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
        expect.objectContaining({
          owner: 'epik-agent',
          repo: 'test',
          issue_number: 42,
        }),
      );
    });

    it('ignores conversational mentions (no command)', async () => {
      const { app, handlers } = makeAppMock();
      registerHandlers(app);

      const octokit = makeOctokit();
      const payload: MockIssueCommentPayload = {
        comment: { body: 'thanks @epik[bot]!', performed_via_github_app: null },
        issue: { number: 10 },
        repository: { full_name: 'epik-agent/test', owner: { login: 'epik-agent' }, name: 'test' },
      };

      await getHandler(handlers, 'issue_comment.created')({ octokit, payload });

      expect(octokit.request).not.toHaveBeenCalled();
    });

    it('ignores comments that do not mention @epik at all', async () => {
      const { app, handlers } = makeAppMock();
      registerHandlers(app);

      const octokit = makeOctokit();
      const payload: MockIssueCommentPayload = {
        comment: { body: 'Great issue!', performed_via_github_app: null },
        issue: { number: 10 },
        repository: { full_name: 'epik-agent/test', owner: { login: 'epik-agent' }, name: 'test' },
      };

      await getHandler(handlers, 'issue_comment.created')({ octokit, payload });

      expect(octokit.request).not.toHaveBeenCalled();
    });

    it('ignores its own comments (app self-reply guard)', async () => {
      process.env.APP_ID = '999';
      const { app, handlers } = makeAppMock();
      registerHandlers(app);

      const octokit = makeOctokit();
      const payload: MockIssueCommentPayload = {
        comment: {
          body: '@epik help',
          performed_via_github_app: { id: 999 },
        },
        issue: { number: 7 },
        repository: { full_name: 'epik-agent/test', owner: { login: 'epik-agent' }, name: 'test' },
      };

      await getHandler(handlers, 'issue_comment.created')({ octokit, payload });

      expect(octokit.request).not.toHaveBeenCalled();
      delete process.env.APP_ID;
    });
  });

  describe('issues.opened', () => {
    it('is registered and does not throw', () => {
      const { app, handlers } = makeAppMock();
      registerHandlers(app);

      const payload: MockIssuesPayload = {
        issue: { number: 1, title: 'A brand new issue' },
        repository: { full_name: 'epik-agent/test' },
      };

      expect(() => getHandler(handlers, 'issues.opened')({ payload })).not.toThrow();
    });
  });

  describe('pull_request', () => {
    it('is registered and does not throw', () => {
      const { app, handlers } = makeAppMock();
      registerHandlers(app);

      const payload: MockPullRequestPayload = {
        pull_request: { number: 5, title: 'My PR' },
        repository: { full_name: 'epik-agent/test' },
      };

      expect(() => getHandler(handlers, 'pull_request')({ payload })).not.toThrow();
    });
  });

  describe('onError', () => {
    it('registers an error handler', () => {
      const { app, errorHandlers } = makeAppMock();
      registerHandlers(app);
      expect(errorHandlers).toHaveLength(1);
    });
  });
});

describe('registerHandlers — command routing is case-insensitive', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('responds to @EPIK STATUS (uppercase command)', async () => {
    const { app, handlers } = makeAppMock();
    registerHandlers(app);

    const octokit = makeOctokit();
    const payload: MockIssueCommentPayload = {
      comment: { body: '@EPIK STATUS', performed_via_github_app: null },
      issue: { number: 3 },
      repository: { full_name: 'epik-agent/test', owner: { login: 'epik-agent' }, name: 'test' },
    };

    await getHandler(handlers, 'issue_comment.created')({ octokit, payload });

    expect(octokit.request).toHaveBeenCalledOnce();
  });
});
