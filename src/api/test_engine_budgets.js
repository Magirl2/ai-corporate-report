// src/api/test_engine_budgets.js
import { ServerOrchestrator } from '../../api/_lib/orchestrator.js';

/**
 * Timeout 동작을 검증하기 위한 Mock Orchestrator
 */
class BudgetTestOrchestrator extends ServerOrchestrator {
  constructor(companyName) {
    super(companyName, (status) => console.log(`[Status] ${status}`));
  }

  // 재무 분석을 의도적으로 지연시킴 (45초 예산보다 긴 60초)
  async engineAnalyzeFinancial(signal) {
    console.log('[Test] Financial engine started (Simulating 60s work...)');
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 60000);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('AbortSignal triggered in Financial engine'));
        });
      });
      return { ok: true, data: { financial: { overview: { summary: 'Should not reach' } }, score: 80 } };
    } catch (err) {
      console.log(`[Test] Financial engine caught: ${err.message}`);
      throw err;
    }
  }

  // 전략 분석은 빠르게 완료
  async engineAnalyzeStrategy(signal) {
    console.log('[Test] Strategy engine started (Simulating 2s work...)');
    await new Promise(r => setTimeout(r, 2000));
    return { ok: true, data: { strategy: { macroTrend: { summary: 'Strategy Success' } }, score: 90 } };
  }

  // 뉴스 분석은 빠르게 완료
  async engineAnalyzeNews(signal) {
    console.log('[Test] News engine started (Simulating 1s work...)');
    await new Promise(r => setTimeout(r, 1000));
    return { ok: true, data: { news: { marketSentiment: { status: 'Positive' } }, score: 85 } };
  }
}

async function runBudgetTest() {
  console.log('--- Starting Independent Engine Budget Verification ---\n');
  
  const orch = new BudgetTestOrchestrator('Timeout Test Corp');
  
  // 상태 초기화 (Resolve/Search 생략하고 바로 Analyze 테스트 가능하도록 설정)
  orch.state.raw.searchBriefing = { companyIdentity: 'Test' };

  console.log('Running engineAnalyze...');
  const startTime = Date.now();
  const analyzeRes = await orch.measureStage('analyze', (sig) => orch.engineAnalyze(sig));
  const duration = Date.now() - startTime;

  if (analyzeRes.ok) {
    orch.state.analysis = analyzeRes.data.analysis;
    orch.state.score = analyzeRes.data.score;
    orch.state.iteration = analyzeRes.data.iteration;
  }

  console.log(`\nAnalyze Stage Finished. Duration: ${duration}ms`);
  console.log(`Status: ${analyzeRes.ok ? 'OK' : 'FAIL'}`);
  
  // 검증 1: 전체 analyze 스테이지는 성공해야 함 (일부 실패 허용)
  if (!analyzeRes.ok) throw new Error('Analyze stage should be OK even if one sub-engine fails');

  // 검증 2: Metadata에 timeout 기록이 있어야 함
  const staged = orch.metadata.stagedEngines;
  console.log('\nStage Metadata:');
  console.log(`- analyze-financial: ${staged['analyze-financial'].status} (${staged['analyze-financial'].durationMs}ms)`);
  console.log(`- analyze-strategy: ${staged['analyze-strategy'].status} (${staged['analyze-strategy'].durationMs}ms)`);
  console.log(`- analyze-news: ${staged['analyze-news'].status} (${staged['analyze-news'].durationMs}ms)`);

  if (staged['analyze-financial'].status !== 'timeout') {
    throw new Error('Financial engine should have timed out');
  }
  if (staged['analyze-strategy'].status !== 'completed') {
    throw new Error('Strategy engine should have completed successfully');
  }
  
  // 검증 3: 결과가 올바르게 조립되었는지 확인
  const final = orch.assembleFinalReport();
  if (final.report.macroTrend.summary !== 'Strategy Success') {
    throw new Error('Strategy data missing in final report');
  }
  if (final.report.financialAnalysis.overview !== null) {
    // normalizeAnalystOutput에 의해 null이 되어야 함 (실패했으므로)
    // 현재 normalizeAnalystOutput은 기본적으로 { summary, detail } 객체를 반환하므로 empty 체크 필요
    if (final.report.financialAnalysis.overview.summary !== '') {
        throw new Error('Financial data should be empty/null due to timeout');
    }
  }

  console.log('\n✅ All Independent Budget Verifications Passed!');
}

runBudgetTest().catch(err => {
  console.error('\n❌ Budget Test Failed:', err.message);
  process.exit(1);
});
