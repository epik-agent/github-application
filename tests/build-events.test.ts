import { describe, it, expect } from 'vitest';
import {
  formatBuildStartComment,
  formatPrSummaryComment,
  formatFeatureCompleteComment,
  formatBuildFailedComment,
} from '../lib/build-events.js';

describe('formatBuildStartComment', () => {
  it('includes the heading and acceptance criteria list', () => {
    const result = formatBuildStartComment(['Set up CI', 'Add webhook handler', 'Write tests']);
    expect(result).toContain('Starting implementation');
    expect(result).toContain('Set up CI');
    expect(result).toContain('Add webhook handler');
    expect(result).toContain('Write tests');
  });

  it('formats each criterion as a checklist item', () => {
    const result = formatBuildStartComment(['Do the thing']);
    expect(result).toMatch(/- \[ \] Do the thing/);
  });

  it('handles empty criteria list gracefully', () => {
    const result = formatBuildStartComment([]);
    expect(result).toContain('Starting implementation');
  });
});

describe('formatPrSummaryComment', () => {
  it('includes the PR link', () => {
    const result = formatPrSummaryComment(42, 'https://github.com/org/repo/pull/42');
    expect(result).toContain('#42');
    expect(result).toContain('https://github.com/org/repo/pull/42');
  });

  it('mentions what was implemented', () => {
    const result = formatPrSummaryComment(7, 'https://github.com/org/repo/pull/7');
    expect(result).toMatch(/implemented|pull request/i);
  });
});

describe('formatFeatureCompleteComment', () => {
  it('includes the issue count', () => {
    const result = formatFeatureCompleteComment(5);
    expect(result).toContain('5');
    expect(result).toMatch(/feature complete/i);
  });

  it('uses singular when count is 1', () => {
    const result = formatFeatureCompleteComment(1);
    expect(result).toContain('1');
  });
});

describe('formatBuildFailedComment', () => {
  it('includes the error message', () => {
    const result = formatBuildFailedComment('Tests failed: 3 assertions failed');
    expect(result).toContain('Tests failed: 3 assertions failed');
  });

  it('indicates the build failed', () => {
    const result = formatBuildFailedComment('timeout');
    expect(result).toMatch(/failed|error/i);
  });
});
