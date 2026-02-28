import { describe, it, expect } from 'vitest';
import { parseMentionCommand } from '../lib/mention-parser.js';

describe('parseMentionCommand', () => {
  describe('status command', () => {
    it('parses bare status command', () => {
      const result = parseMentionCommand('@epik[bot] status');
      expect(result).toEqual({ type: 'status', issueNumber: null });
    });

    it('parses status with issue number', () => {
      const result = parseMentionCommand('@epik[bot] status #42');
      expect(result).toEqual({ type: 'status', issueNumber: 42 });
    });

    it('parses status with issue number without hash', () => {
      const result = parseMentionCommand('@epik[bot] status 42');
      expect(result).toEqual({ type: 'status', issueNumber: 42 });
    });

    it('is case-insensitive for the command', () => {
      const result = parseMentionCommand('@epik[bot] STATUS');
      expect(result).toEqual({ type: 'status', issueNumber: null });
    });

    it('handles extra whitespace around the command', () => {
      const result = parseMentionCommand('  @epik[bot]   status  ');
      expect(result).toEqual({ type: 'status', issueNumber: null });
    });
  });

  describe('help command', () => {
    it('parses help command', () => {
      const result = parseMentionCommand('@epik[bot] help');
      expect(result).toEqual({ type: 'help' });
    });

    it('parses HELP in uppercase', () => {
      const result = parseMentionCommand('@epik[bot] HELP');
      expect(result).toEqual({ type: 'help' });
    });
  });

  describe('unknown command', () => {
    it('returns unknown for unrecognized command words', () => {
      const result = parseMentionCommand('@epik[bot] foobar');
      expect(result).toEqual({ type: 'unknown', raw: 'foobar' });
    });

    it('returns unknown for multi-word unrecognized commands', () => {
      const result = parseMentionCommand('@epik[bot] do something cool');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('unknown');
    });
  });

  describe('conversational (no command)', () => {
    it('returns null for plain thank-you', () => {
      const result = parseMentionCommand('thanks @epik[bot]!');
      expect(result).toBeNull();
    });

    it('returns null for @epik mention with no command', () => {
      const result = parseMentionCommand('hey @epik[bot] nice work');
      expect(result).toBeNull();
    });

    it('returns null when @epik is not at start of recognized pattern', () => {
      const result = parseMentionCommand('I asked @epik[bot] about this');
      expect(result).toBeNull();
    });
  });

  describe('alternative @epik forms', () => {
    it('parses @epik without [bot] suffix', () => {
      const result = parseMentionCommand('@epik status');
      expect(result).toEqual({ type: 'status', issueNumber: null });
    });
  });
});
