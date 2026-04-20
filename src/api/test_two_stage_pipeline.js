// src/api/test_two_stage_pipeline.js
import { ServerOrchestrator } from '../../api/_lib/orchestrator.js';

async function runTests() {
  console.log('--- Starting 2-Stage Pipeline Verification ---');

  const companyName = '삼성전자';
  const orch = new ServerOrchestrator(companyName, (status) => {
    console.log(`[Status] ${status}`);
  });

  // 1. Stage 1 Verification
  console.log('\n[Test 1] Stage 1: Search & Briefing');
  const stage1Data = await orch.runStage1Search();
  
  if (!stage1Data.identity) throw new Error('Stage 1 missing identity');
  if (!stage1Data.raw.searchBriefing) throw new Error('Stage 1 missing searchBriefing');
  if (!stage1Data.raw.finance) console.log('⚠️ Stage 1 finance data is null (Expected if API key missing or network error, but artifact structure exists)');
  
  console.log('✅ Stage 1 produced valid handoff artifact');
  console.log('Identity:', JSON.stringify(stage1Data.identity));
  console.log('Search Briefing Keys:', Object.keys(stage1Data.raw.searchBriefing));

  // 2. Stage 2 Verification (Using Mock Stage 1 Output to verify isolation)
  console.log('\n[Test 2] Stage 2: Analysis & Assembly (Isolated with Mock data)');
  const orch2 = new ServerOrchestrator(companyName, (status) => {
    console.log(`[Status] ${status}`);
  });

  const mockStage1Data = {
    identity: { type: 'KR', ticker: '005930' },
    raw: {
      searchBriefing: { companyIdentity: 'Mock Samsung', newsFindings: ['News 1'], rawContent: 'Raw text' },
      finance: { yearly: [] },
      disclosures: [],
      sources: [{ title: 'DART', uri: 'http://dart.fss.or.kr' }]
    }
  };

  // We still expect API errors for Analyze/Compose, but we want to see that Stage 2 
  // correctly hydrates and attempts execution using the mock data.
  const finalReport = await orch2.runStage2Analysis(mockStage1Data);

  if (!finalReport.companyName) throw new Error('Final report missing companyName');
  
  // Verify state hydration
  if (orch2.state.resolve.ticker !== '005930') throw new Error('State hydration failed: identity');
  if (orch2.state.raw.sources.length === 0) throw new Error('State hydration failed: sources');

  console.log('✅ Stage 2 successfully hydrated and consumed Mock Stage 1 artifact');
  console.log('Final Report Company:', finalReport.companyName);
  console.log('Total Duration:', finalReport.metadata?.totalDurationMs, 'ms');

  // 3. Backward Compatibility Verification
  console.log('\n[Test 3] Legacy run() Wrapper');
  const orch3 = new ServerOrchestrator('Apple', (status) => {});
  const legacyReport = await orch3.run();
  if (!legacyReport.report) throw new Error('Legacy run() failed to produce report');
  console.log('✅ Legacy run() wrapper works as expected');

  console.log('\n--- All 2-Stage Pipeline Verifications Passed ---');
}

runTests().catch(err => {
  console.error('\n❌ 2-Stage Verification Failed:', err);
  process.exit(1);
});
