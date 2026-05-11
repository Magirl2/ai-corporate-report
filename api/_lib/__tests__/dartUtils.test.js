import { describe, it, expect } from 'vitest';
import {
  normalizeCorpName,
  extractKeyword,
  ALIAS_MAP,
  COMMON_CORPS,
} from '../dart-utils.js';

describe('dart-utils', () => {
  describe('normalizeCorpName', () => {
    it('removes 주식회사 prefix/suffix', () => {
      expect(normalizeCorpName('주식회사 삼성전자')).toBe('삼성전자');
      expect(normalizeCorpName('삼성전자 주식회사')).toBe('삼성전자');
    });
    it('removes ㈜ shorthand', () => {
      expect(normalizeCorpName('㈜카카오')).toBe('카카오');
    });
    it('removes (주) shorthand', () => {
      expect(normalizeCorpName('(주)네이버')).toBe('네이버');
    });
    it('strips all spaces by default', () => {
      expect(normalizeCorpName('LG 전자')).toBe('LG전자');
    });
    it('preserves single spaces when preserveSpace=true', () => {
      expect(normalizeCorpName('LG 전자 주식회사', true)).toBe('LG 전자');
    });
    it('returns empty string for null/undefined', () => {
      expect(normalizeCorpName(null)).toBe('');
      expect(normalizeCorpName(undefined)).toBe('');
    });
    it('handles 그룹 suffix', () => {
      expect(normalizeCorpName('삼성 그룹')).toBe('삼성');
    });
  });

  describe('extractKeyword', () => {
    it('strips 전자 suffix', () => {
      expect(extractKeyword('삼성전자')).toBe('삼성');
    });
    it('strips 제약 suffix', () => {
      expect(extractKeyword('유한양행제약')).toBe('유한양행');
    });
    it('does not strip suffix if it equals the full name', () => {
      expect(extractKeyword('전자')).toBe('전자');
    });
    it('returns name unchanged if no known suffix', () => {
      expect(extractKeyword('카카오')).toBe('카카오');
    });
    it('strips 에너지 suffix when it is at the end', () => {
      expect(extractKeyword('한화에너지')).toBe('한화');
    });
    it('does not strip 에너지 when it is not a suffix', () => {
      expect(extractKeyword('LG에너지솔루션')).toBe('LG에너지솔루션');
    });
  });

  describe('ALIAS_MAP', () => {
    it('maps 토스 to 비바리퍼블리카', () => {
      expect(ALIAS_MAP['토스']).toBe('비바리퍼블리카');
    });
    it('maps 배민 to 우아한형제들', () => {
      expect(ALIAS_MAP['배민']).toBe('우아한형제들');
    });
    it('maps 마켓컬리 to 컬리', () => {
      expect(ALIAS_MAP['마켓컬리']).toBe('컬리');
    });
    it('has no duplicate keys', () => {
      const keys = Object.keys(ALIAS_MAP);
      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    });
  });

  describe('COMMON_CORPS', () => {
    it('contains 삼성전자 with correct corp_code', () => {
      expect(COMMON_CORPS['삼성전자']).toBe('00126380');
    });
    it('contains NAVER', () => {
      expect(COMMON_CORPS['NAVER']).toBe('00266961');
    });
    it('all corp_codes are 8-digit zero-padded strings', () => {
      for (const [name, code] of Object.entries(COMMON_CORPS)) {
        expect(code).toMatch(/^\d{8}$/, `${name}: ${code} is not 8 digits`);
      }
    });
  });
});
