/**
 * Build event types and comment formatting for @epik[bot] lifecycle messages.
 *
 * Local Epik POSTs build events to /api/build-event. The GitHub App reads the
 * event type and calls the appropriate formatter, then posts the comment via
 * the installation Octokit.
 */

/** Discriminated union of all build event types. */
export type BuildEvent = BuildStartEvent | PrCreatedEvent | FeatureCompleteEvent | BuildFailedEvent;

export interface BuildStartEvent {
  readonly type: 'build_start';
  readonly owner: string;
  readonly repo: string;
  readonly issueNumber: number;
  readonly installationId: number;
  readonly acceptanceCriteria: readonly string[];
}

export interface PrCreatedEvent {
  readonly type: 'pr_created';
  readonly owner: string;
  readonly repo: string;
  readonly issueNumber: number;
  readonly installationId: number;
  readonly prNumber: number;
  readonly prUrl: string;
}

export interface FeatureCompleteEvent {
  readonly type: 'feature_complete';
  readonly owner: string;
  readonly repo: string;
  readonly issueNumbers: readonly number[];
  readonly installationId: number;
  readonly totalIssues: number;
}

export interface BuildFailedEvent {
  readonly type: 'build_failed';
  readonly owner: string;
  readonly repo: string;
  readonly issueNumber: number;
  readonly installationId: number;
  readonly reason: string;
}

/**
 * Formats the comment posted when a build starts on an issue.
 * Includes acceptance criteria as an unchecked checklist.
 */
export function formatBuildStartComment(acceptanceCriteria: readonly string[]): string {
  const lines: string[] = [`🔨 **Starting implementation** — acceptance criteria:`, ``];

  if (acceptanceCriteria.length === 0) {
    lines.push(`_(no acceptance criteria listed)_`);
  } else {
    for (const criterion of acceptanceCriteria) {
      lines.push(`- [ ] ${criterion}`);
    }
  }

  return lines.join('\n');
}

/**
 * Formats the comment posted on a PR when it is created during a build.
 */
export function formatPrSummaryComment(prNumber: number, prUrl: string): string {
  return [
    `✅ **Pull request [#${String(prNumber)}](${prUrl}) created** — implementation is ready for review.`,
    ``,
    `This pull request was opened automatically by @epik-agent as part of the build.`,
  ].join('\n');
}

/**
 * Formats the comment posted on each issue when a feature is fully complete.
 */
export function formatFeatureCompleteComment(totalIssues: number): string {
  const issueWord = totalIssues === 1 ? 'issue' : 'issues';
  return [
    `🎉 **Feature complete** — all ${String(totalIssues)} ${issueWord} implemented and merged.`,
    ``,
    `The build finished successfully. Every acceptance criterion has been satisfied.`,
  ].join('\n');
}

/**
 * Formats the comment posted on an issue when its build fails.
 */
export function formatBuildFailedComment(reason: string): string {
  return [
    `❌ **Build failed**`,
    ``,
    `> ${reason}`,
    ``,
    `The build encountered an error and could not complete. Check the logs for details.`,
  ].join('\n');
}
