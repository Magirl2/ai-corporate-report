import { describe, it, expect } from 'vitest';
import {
  getHostname,
  classifySourceType,
  scoreSourceQuality,
  normalizeSourceWithQuality,
  dedupeSourcesByUrl,
  filterReportSources,
} from '../sourceQuality.js';

describe('sourceQuality', () => {
  describe('getHostname', () => {
    it('strips www prefix and lowercases', () => {
      expect(getHostname('https://www.Reuters.com/article')).toBe('reuters.com');
    });
    it('returns null for null/empty input', () => {
      expect(getHostname(null)).toBeNull();
      expect(getHostname('')).toBeNull();
    });
    it('returns null for malformed URL', () => {
      expect(getHostname('not-a-url')).toBeNull();
    });
  });

  describe('classifySourceType', () => {
    it('classifies DART as official', () => {
      expect(classifySourceType('https://opendart.fss.or.kr/api/disclosures')).toBe('official');
    });
    it('classifies Reuters as global_finance', () => {
      expect(classifySourceType('https://reuters.com/news/story')).toBe('global_finance');
    });
    it('classifies 한국경제 as kr_finance', () => {
      expect(classifySourceType('https://hankyung.com/economy/article')).toBe('kr_finance');
    });
    it('classifies FMP as finance_data', () => {
      expect(classifySourceType('https://financialmodelingprep.com/profile')).toBe('finance_data');
    });
    it('classifies tistory blog as blocked', () => {
      expect(classifySourceType('https://myblog.tistory.com/123')).toBe('blocked');
    });
    it('classifies IR URL path as official_ir', () => {
      expect(classifySourceType('https://example.com/investor/results')).toBe('official_ir');
    });
    it('classifies unknown domain as general', () => {
      expect(classifySourceType('https://somenewssite.io/article')).toBe('general');
    });
    it('classifies null URL as unknown', () => {
      expect(classifySourceType(null)).toBe('unknown');
    });
  });

  describe('scoreSourceQuality', () => {
    it('gives 98 to official DART source', () => {
      expect(scoreSourceQuality({ url: 'https://opendart.fss.or.kr/disclosures' })).toBe(98);
    });
    it('gives 85 to Reuters', () => {
      expect(scoreSourceQuality({ url: 'https://reuters.com/article' })).toBe(85);
    });
    it('gives 20 to blocked blog', () => {
      expect(scoreSourceQuality({ url: 'https://myblog.tistory.com/post' })).toBe(20);
    });
    it('gives 10 for sources with no URL', () => {
      expect(scoreSourceQuality({ title: 'No URL source' })).toBe(10);
    });
  });

  describe('normalizeSourceWithQuality', () => {
    it('assigns qualityTier high for DART source', () => {
      const result = normalizeSourceWithQuality({ url: 'https://opendart.fss.or.kr/' }, 0);
      expect(result.qualityTier).toBe('high');
      expect(result.qualityScore).toBe(98);
      expect(result.reliability).toBe('verified');
    });
    it('assigns qualityTier blocked for SNS source', () => {
      const result = normalizeSourceWithQuality({ url: 'https://blog.naver.com/post/123' }, 0);
      expect(result.qualityTier).toBe('blocked');
      expect(result.reliability).toBe('unverified');
    });
    it('adds a note for global_finance sources', () => {
      const result = normalizeSourceWithQuality({ url: 'https://reuters.com/article' }, 0);
      expect(result.note).toBe('원문 접근 제한 가능');
    });
    it('generates fallback id if none provided', () => {
      const result = normalizeSourceWithQuality({ url: 'https://example.com' }, 3);
      expect(result.id).toBe('src-3');
    });
    it('preserves provided title', () => {
      const result = normalizeSourceWithQuality({ url: 'https://dart.fss.or.kr/', title: '삼성전자 사업보고서' }, 0);
      expect(result.title).toBe('삼성전자 사업보고서');
    });
    it('handles uri field as url fallback', () => {
      const result = normalizeSourceWithQuality({ uri: 'https://opendart.fss.or.kr/' }, 0);
      expect(result.url).toBe('https://opendart.fss.or.kr/');
      expect(result.qualityTier).toBe('high');
    });
  });

  describe('dedupeSourcesByUrl', () => {
    it('removes duplicate URLs', () => {
      const sources = [
        { url: 'https://reuters.com/a', qualityScore: 85 },
        { url: 'https://reuters.com/a', qualityScore: 85 },
        { url: 'https://dart.fss.or.kr/b', qualityScore: 98 },
      ];
      const result = dedupeSourcesByUrl(sources);
      expect(result).toHaveLength(2);
    });
    it('uses title as fallback key when url is absent', () => {
      const sources = [
        { title: 'Report A' },
        { title: 'Report A' },
        { title: 'Report B' },
      ];
      expect(dedupeSourcesByUrl(sources)).toHaveLength(2);
    });
  });

  describe('filterReportSources', () => {
    it('returns sources sorted by qualityScore descending', () => {
      const sources = [
        { url: 'https://blog.naver.com/post', title: 'low', qualityScore: 20 },
        { url: 'https://opendart.fss.or.kr/', title: 'high', qualityScore: 98 },
        { url: 'https://reuters.com/article', title: 'mid', qualityScore: 85 },
      ];
      const result = filterReportSources(sources);
      expect(result[0].qualityScore).toBe(98);
      expect(result[1].qualityScore).toBe(85);
      expect(result[2].qualityScore).toBe(20);
    });
  });
});
