import { describe, it, expect } from 'vitest';
import { buildDynamicSummary } from '../compareHelpers';

describe('compareHelpers', () => {
  describe('buildDynamicSummary', () => {
    it('generates the correct summary when company A wins all metrics', () => {
      const metricA = { revenueGrowth: '20.0', operatingMargin: '15.0', roe: '10.0', debtRatio: '50.0' };
      const metricB = { revenueGrowth: '10.0', operatingMargin:  '5.0', roe:  '5.0', debtRatio: '100.0' };
      
      const summary = buildDynamicSummary('Company A', 'Company B', metricA, metricB);
      
      expect(summary).toContain('매출 성장률에서 Company A(20.0)이 Company B(10.0)보다 앞서 있습니다.');
      expect(summary).toContain('수익성 측면에서 Company A의 영업이익률(15.0)이 더 높아');
      expect(summary).toContain('자기자본이익률(ROE)은 Company A(10.0)이 더 높아');
      expect(summary).toContain('부채비율은 Company A이 더 낮아 재무 안정성 측면에서 유리한 구조입니다.');
    });

    it('generates the correct summary when company B wins all metrics', () => {
      const metricA = { revenueGrowth: '5.0', operatingMargin: '5.0', roe: '5.0', debtRatio: '150.0' };
      const metricB = { revenueGrowth: '15.0', operatingMargin: '25.0', roe: '15.0', debtRatio: '80.0' };
      
      const summary = buildDynamicSummary('Company A', 'Company B', metricA, metricB);
      
      expect(summary).toContain('매출 성장률에서 Company B(15.0)이 Company A(5.0)보다 앞서 있습니다.');
      expect(summary).toContain('수익성 측면에서 Company B의 영업이익률(25.0)이 더 높아');
      expect(summary).toContain('자기자본이익률(ROE)은 Company B(15.0)이 더 높아');
      expect(summary).toContain('부채비율은 Company B이 더 낮아');
    });

    it('returns fallback string when metrics are missing or cannot be parsed', () => {
      const metricA = { revenueGrowth: null };
      const metricB = { revenueGrowth: 'N/A' };
      
      const summary = buildDynamicSummary('Company A', 'Company B', metricA, metricB);
      expect(summary).toBe('비교 지표 데이터를 충분히 확보하지 못했습니다. 상세 수치는 아래 표를 참고하세요.');
    });
  });
});
