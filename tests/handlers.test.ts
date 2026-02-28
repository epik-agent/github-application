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

describe('registerHandlers', () => {
  describe('issue_comment.created', () => {
    it('replies when @epik is mentioned', async () => {
      const { app, handlers } = makeAppMock();
      registerHandlers(app);

      const createComment = vi.fn().mockResolvedValue({});
      const payload: MockIssueCommentPayload = {
        comment: { body: 'Hey @epik, what can you do?', performed_via_github_app: null },
        issue: { number: 42 },
        repository: { full_name: 'epik-agent/test', owner: { login: 'epik-agent' }, name: 'test' },
      };

      const octokit = { rest: { issues: { createComment } } };
      await getHandler(handlers, 'issue_comment.created')({ octokit, payload });

      expect(createComment).toHaveBeenCalledOnce();
      expect(createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'epik-agent',
          repo: 'test',
          issue_number: 42,
        }),
      );
    });

    it('ignores comments that do not mention @epik', async () => {
      const { app, handlers } = makeAppMock();
      registerHandlers(app);

      const createComment = vi.fn();
      const payload: MockIssueCommentPayload = {
        comment: { body: 'Great issue!', performed_via_github_app: null },
        issue: { number: 10 },
        repository: { full_name: 'epik-agent/test', owner: { login: 'epik-agent' }, name: 'test' },
      };

      const octokit = { rest: { issues: { createComment } } };
      await getHandler(handlers, 'issue_comment.created')({ octokit, payload });

      expect(createComment).not.toHaveBeenCalled();
    });

    it('ignores its own comments (app self-reply guard)', async () => {
      process.env.APP_ID = '999';
      const { app, handlers } = makeAppMock();
      registerHandlers(app);

      const createComment = vi.fn();
      const payload: MockIssueCommentPayload = {
        comment: {
          body: '@epik hello',
          performed_via_github_app: { id: 999 },
        },
        issue: { number: 7 },
        repository: { full_name: 'epik-agent/test', owner: { login: 'epik-agent' }, name: 'test' },
      };

      const octokit = { rest: { issues: { createComment } } };
      await getHandler(handlers, 'issue_comment.created')({ octokit, payload });

      expect(createComment).not.toHaveBeenCalled();
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

describe('registerHandlers — @epik mention is case-insensitive', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('responds to @EPIK (uppercase) mention', async () => {
    const { app, handlers } = makeAppMock();
    registerHandlers(app);

    const createComment = vi.fn().mockResolvedValue({});
    const payload: MockIssueCommentPayload = {
      comment: { body: '@EPIK status please', performed_via_github_app: null },
      issue: { number: 3 },
      repository: { full_name: 'epik-agent/test', owner: { login: 'epik-agent' }, name: 'test' },
    };

    const octokit = { rest: { issues: { createComment } } };
    await getHandler(handlers, 'issue_comment.created')({ octokit, payload });

    expect(createComment).toHaveBeenCalledOnce();
  });
});
