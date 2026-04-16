import { describe, it, expect } from 'vitest';
import { extractJson, parseNumber, safeString } from '../formatters';

describe('formatters', () => {
  describe('extractJson', () => {
    it('extracts standard json cleanly', () => {
      const text = 'Some markdown\n```json\n{"foo": "bar"}\n```';
      expect(extractJson(text)).toBe('{"foo": "bar"}');
    });

    it('extracts arrays cleanly', () => {
      const text = 'Here is the data: [{"foo": "bar"}] end.';
      expect(extractJson(text)).toBe('[{"foo": "bar"}]');
    });

    it('handles trailing commas', () => {
      const text = '{"foo": "bar",}';
      expect(extractJson(text)).toBe('{"foo": "bar"}');
    });

    it('returns null for unparsable or empty string', () => {
      expect(extractJson('')).toBeNull();
      expect(extractJson('just some text without blocks')).toBeNull();
    });
  });

  describe('parseNumber', () => {
    it('parses valid numeric strings', () => {
      expect(parseNumber('123.45')).toBe(123.45);
      expect(parseNumber('-10')).toBe(-10);
      expect(parseNumber('1,000.50')).toBe(1000.50);
    });

    it('returns null for invalid strings', () => {
      expect(parseNumber('N/A')).toBeNull();
      expect(parseNumber(null)).toBeNull();
      expect(parseNumber(undefined)).toBeNull();
    });
  });

  describe('safeString', () => {
    it('returns information missing for null/undefined', () => {
      expect(safeString(null)).toBe('정보 없음');
      expect(safeString(undefined)).toBe('정보 없음');
    });

    it('returns string exactly if provided', () => {
      expect(safeString('Hello')).toBe('Hello');
      expect(safeString(100)).toBe('100');
    });
  });
});
