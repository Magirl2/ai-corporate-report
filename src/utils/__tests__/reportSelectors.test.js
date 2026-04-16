import { describe, it, expect } from 'vitest';
import { getYearlyMetrics, getLatestMetrics, getSourceBadge, getSafeItems } from '../reportSelectors';

describe('reportSelectors', () => {
  describe('getYearlyMetrics', () => {
    it('returns empty array when no data present', () => {
      expect(getYearlyMetrics(null)).toEqual([]);
      expect(getYearlyMetrics({})).toEqual([]);
    });

    it('returns financeData metrics over dartFinance', () => {
      const data = {
        financeData: { yearlyMetrics: [{ year: '2023', rev: 100 }] },
        dartFinance: { yearlyMetrics: [{ year: '2022', rev: 50 }] }
      };
      expect(getYearlyMetrics(data)).toEqual([{ year: '2023', rev: 100 }]);
    });

    it('falls back to dartFinance if financeData lacks metrics', () => {
      const data = {
        dartFinance: { yearlyMetrics: [{ year: '2022', rev: 50 }] }
      };
      expect(getYearlyMetrics(data)).toEqual([{ year: '2022', rev: 50 }]);
    });
  });

  describe('getLatestMetrics', () => {
    it('returns empty object when no yearly metrics exist', () => {
      expect(getLatestMetrics(null)).toEqual({});
    });

    it('returns the last item in the yearly metrics array', () => {
      const data = {
        financeData: {
          yearlyMetrics: [
            { year: '2021', rev: 100 },
            { year: '2022', rev: 150 },
            { year: '2023', rev: 200 }
          ]
        }
      };
      expect(getLatestMetrics(data)).toEqual({ year: '2023', rev: 200 });
    });
  });

  describe('getSourceBadge', () => {
    it('identifies US stocks via FMP currency != KRW', () => {
      const data = { financeData: { raw: { currency: 'USD' } } };
      expect(getSourceBadge(data)).toBe('FMP · US');
    });

    it('identifies KR stocks via DART', () => {
      const data = { financeData: { raw: { currency: 'KRW' } } };
      expect(getSourceBadge(data)).toBe('DART · KR');
    });

    it('falls back to AI REPORT when no raw finance data exists', () => {
      expect(getSourceBadge({})).toBe('AI REPORT');
      expect(getSourceBadge(null)).toBe('AI REPORT');
    });
  });

  describe('getSafeItems', () => {
    it('handles arrays', () => {
      expect(getSafeItems(['a', 'b'])).toEqual(['a', 'b']);
    });

    it('wraps strings in array', () => {
      expect(getSafeItems('hello')).toEqual(['hello']);
    });

    it('returns empty array for invalid inputs', () => {
      expect(getSafeItems(null)).toEqual([]);
      expect(getSafeItems(undefined)).toEqual([]);
      expect(getSafeItems({})).toEqual([]);
    });
  });
});
