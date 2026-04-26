// src/api/test_contract_compatibility.js
/* global process */
import { ServerOrchestrator } from '../../api/_lib/orchestrator.js';
/**
 * UI가 기대하는 보고서 스키마 정의 (Contract)
 */
const EXPECTED_REPORT_KEYS = [
  'macroTrend',
  'industryStatus',
  'vision',
  'businessModel',
  'swotAnalysis',
  'marketSentiment',
  'recentNews',
  'financialAnalysis',
  'markdown'
];

const EXPECTED_FINANCIAL_KEYS = ['overview', 'keyMetrics'];

/**
 * Mocking Orchestrator for unit testing assembly
 */
class MockOrchestrator extends ServerOrchestrator {
  constructor(companyName) {
    super(companyName, () => {});
  }

  // 억지로 특정 상태 주입
  setState(newState) {
    this.state = { ...this.state, ...newState };
  }
}

async function runTests() {
  console.log('--- Starting UI Contract Compatibility Tests ---\n');

  // Test 1: Full Success Scenario
  console.log('[Test 1] Full Success Path');
  const orch1 = new MockOrchestrator('Test Company');
  orch1.setState({
    analysis: {
      financial: { overview: { summary: 'f-sum', detail: 'f-det' }, keyMetrics: [{ name: 'M1', value: '10' }] },
      strategy: { macroTrend: { summary: 's-sum' }, industryStatus: { summary: 'i-sum' }, swotAnalysis: { strengths: ['S1'] } },
      news: { marketSentiment: { status: 'Positive' }, recentNews: [{ headline: 'N1' }] }
    },
    composerMarkdown: '# Hello World',
    score: 95
  });

  const report1 = orch1.assembleFinalReport();
  validateReportShape(report1);
  console.log('✅ Test 1 Passed\n');

  // Test 2: Partial Failure (News missing)
  console.log('[Test 2] Partial Failure (News analyzer failed)');
  const orch2 = new MockOrchestrator('Test Company');
  orch2.setState({
    analysis: {
      financial: { overview: { summary: 'f-sum' } },
      strategy: { macroTrend: { summary: 's-sum' } }
      // news is missing or null
    }
  });

  const report2 = orch2.assembleFinalReport();
  validateReportShape(report2);
  console.log('✅ Test 2 Passed\n');

  // Test 3: Total Analyzer Failure (Fallback to defaults)
  console.log('[Test 3] Total Analyzer Failure Fallback');
  const orch3 = new MockOrchestrator('Test Company');
  orch3.setState({ analysis: null });

  const report3 = orch3.assembleFinalReport();
  validateReportShape(report3);
  console.log('✅ Test 3 Passed\n');

  console.log('--- All UI Contract Tests Passed ---');
}

function validateReportShape(data) {
  if (!data.companyName) throw new Error('Missing companyName');
  if (!data.report) throw new Error('Missing report object');
  
  const report = data.report;
  EXPECTED_REPORT_KEYS.forEach(key => {
    if (!(key in report)) {
      throw new Error(`Missing expected key in report: ${key}`);
    }
  });

  const fin = report.financialAnalysis;
  EXPECTED_FINANCIAL_KEYS.forEach(key => {
    if (!(key in fin)) {
      throw new Error(`Missing expected key in financialAnalysis: ${key}`);
    }
  });

  if (typeof report.markdown !== 'string') throw new Error('report.markdown must be a string');
  if (!Array.isArray(report.recentNews)) throw new Error('report.recentNews must be an array');
  if (!Array.isArray(data.sources)) throw new Error('data.sources must be an array');
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err.message);
  process.exit(1);
});
