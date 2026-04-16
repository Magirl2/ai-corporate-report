import { describe, it, expect } from 'vitest';
import { 
  normalizeSearchBriefing, 
  normalizeAnalystOutput, 
  ServerOrchestrator
} from '../orchestrator.js';

describe('ServerOrchestrator Contract Normalization', () => {

  describe('normalizeSearchBriefing', () => {
    it('provides fallback defaults for empty or null input', () => {
      const result = normalizeSearchBriefing(null);
      expect(result.companyIdentity).toBe(null);
      expect(result.newsFindings).toEqual([]);
      expect(result.risks).toEqual([]);
    });

    it('preserves existing valid string and array fields', () => {
      const valid = {
        companyIdentity: 'Tech Giant',
        newsFindings: ['News 1'],
        risks: ['Risk A']
      };
      const result = normalizeSearchBriefing(valid);
      expect(result.companyIdentity).toBe('Tech Giant');
      expect(result.newsFindings).toEqual(['News 1']);
      expect(result.risks).toEqual(['Risk A']);
    });
  });

  describe('normalizeAnalystOutput', () => {
    it('handles totally missing input with empty structure', () => {
      const result = normalizeAnalystOutput({});
      expect(result.financial.overview).toBe(null);
      expect(result.strategy.swotAnalysis).toEqual({ strengths: [], weaknesses: [], opportunities: [], threats: [] });
      expect(result.news.recentNews).toEqual([]);
    });

    it('transforms legacy string output to { summary, detail } object shape', () => {
      const raw = {
        financial: { overview: 'Strong growth' },
        strategy: { vision: 'AI First' }
      };
      const result = normalizeAnalystOutput(raw);
      expect(result.financial.overview).toEqual({ summary: 'Strong growth', detail: '' });
      expect(result.strategy.vision).toEqual({ summary: 'AI First', detail: '' });
    });
  });

  describe('assembleFinalReport (Single-Report Seam)', () => {
    it('properly shapes the final report from orchestrator internal state', () => {
      // Mocking the class instance variables to test assembleFinalReport purely
      const mockOrchestrator = new ServerOrchestrator('TestCo');
      mockOrchestrator.state = {
        analysis: {
          strategy: { vision: { summary: 'Good', detail: 'More info' } },
          financial: { keyMetrics: [{ year: '2023', rev: 100 }] },
          news: { recentNews: [{ title: 'Breaking' }] }
        },
        raw: {
          sources: [{ uri: 'https://example.com' }],
          finance: { test: true }
        },
        composerMarkdown: '# Hello World'
      };

      const finalReport = mockOrchestrator.assembleFinalReport();
      
      // Verification of single-report contract
      expect(finalReport.companyName).toBe('TestCo');
      expect(finalReport.report.vision.summary).toBe('Good');
      expect(finalReport.report.financialAnalysis.keyMetrics).toHaveLength(1);
      expect(finalReport.report.recentNews[0].title).toBe('Breaking');
      expect(finalReport.report.markdown).toBe('# Hello World');
      expect(finalReport.sources[0].uri).toBe('https://example.com');
      expect(finalReport.financeData.test).toBe(true);
    });
  });

});
