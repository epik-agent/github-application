/**
 * Parses @epik[bot] mention commands from GitHub comment text.
 *
 * A "command" is a recognised keyword that immediately follows the @epik
 * mention at the start of the comment (ignoring leading whitespace).
 * Conversational mentions (e.g. "thanks @epik[bot]") return null — the
 * bot should not respond to those.
 */

export type MentionCommand = StatusCommand | HelpCommand | UnknownCommand;

export interface StatusCommand {
  readonly type: 'status';
  /** Issue number to query, or null for repo-wide status. */
  readonly issueNumber: number | null;
}

export interface HelpCommand {
  readonly type: 'help';
}

export interface UnknownCommand {
  readonly type: 'unknown';
  /** The raw unrecognised command text (everything after @epik). */
  readonly raw: string;
}

/**
 * The pattern that matches a leading @epik (with or without [bot]) followed
 * by optional whitespace and a command word.
 *
 * Group 1 = command word and everything after it
 */
const MENTION_COMMAND_RE = /^\s*@epik(?:-agent)?(?:\[bot\])?\s+(\S.*)/i;

/**
 * Parses a comment body and returns the recognised command, or null if the
 * comment is conversational (no command pattern detected).
 */
export function parseMentionCommand(commentBody: string): MentionCommand | null {
  const match = MENTION_COMMAND_RE.exec(commentBody.trim());
  if (!match) return null;

  // match[1] is the command + args portion (regex guarantees it is a string)
  const rest = match[1].trim();
  const [commandWord, ...argParts] = rest.split(/\s+/);
  const command = commandWord.toLowerCase();

  if (command === 'status') {
    const issueNumber = parseIssueNumber(argParts.join(' '));
    return { type: 'status', issueNumber };
  }

  if (command === 'help') {
    return { type: 'help' };
  }

  return { type: 'unknown', raw: rest };
}

/**
 * Extracts an issue number from a string like "#42" or "42".
 * Returns null if no valid issue number is found.
 */
function parseIssueNumber(arg: string): number | null {
  if (!arg) return null;
  const match = /^#?(\d+)$/.exec(arg.trim());
  if (!match) return null;
  return parseInt(match[1], 10);
}
