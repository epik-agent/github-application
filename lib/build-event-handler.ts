import type { Octokit } from '@octokit/core';
import {
  type BuildEvent,
  formatBuildStartComment,
  formatBuildFailedComment,
  formatFeatureCompleteComment,
  formatPrSummaryComment,
} from './build-events.js';

/** The machine user assigned to issues during builds. */
const EPIK_ASSIGNEE = 'epik-agent';

type RestOctokit = Octokit & {
  rest: {
    issues: {
      createComment: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        body: string;
      }) => Promise<unknown>;
      addAssignees: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        assignees: string[];
      }) => Promise<unknown>;
      removeAssignees: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        assignees: string[];
      }) => Promise<unknown>;
    };
  };
};

/**
 * Handles a build lifecycle event by posting comments and managing assignees.
 * Accepts an authenticated installation Octokit so this function is fully testable.
 */
export async function handleBuildEvent(event: BuildEvent, octokit: RestOctokit): Promise<void> {
  switch (event.type) {
    case 'build_start': {
      await octokit.rest.issues.addAssignees({
        owner: event.owner,
        repo: event.repo,
        issue_number: event.issueNumber,
        assignees: [EPIK_ASSIGNEE],
      });
      await octokit.rest.issues.createComment({
        owner: event.owner,
        repo: event.repo,
        issue_number: event.issueNumber,
        body: formatBuildStartComment(event.acceptanceCriteria),
      });
      break;
    }

    case 'pr_created': {
      await octokit.rest.issues.createComment({
        owner: event.owner,
        repo: event.repo,
        issue_number: event.issueNumber,
        body: formatPrSummaryComment(event.prNumber, event.prUrl),
      });
      break;
    }

    case 'feature_complete': {
      await Promise.all(
        event.issueNumbers.map(async (issueNumber) => {
          await octokit.rest.issues.removeAssignees({
            owner: event.owner,
            repo: event.repo,
            issue_number: issueNumber,
            assignees: [EPIK_ASSIGNEE],
          });
          await octokit.rest.issues.createComment({
            owner: event.owner,
            repo: event.repo,
            issue_number: issueNumber,
            body: formatFeatureCompleteComment(event.totalIssues),
          });
        }),
      );
      break;
    }

    case 'build_failed': {
      await octokit.rest.issues.removeAssignees({
        owner: event.owner,
        repo: event.repo,
        issue_number: event.issueNumber,
        assignees: [EPIK_ASSIGNEE],
      });
      await octokit.rest.issues.createComment({
        owner: event.owner,
        repo: event.repo,
        issue_number: event.issueNumber,
        body: formatBuildFailedComment(event.reason),
      });
      break;
    }
  }
}
