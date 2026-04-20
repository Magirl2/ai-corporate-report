// src/api/test_two_stage_pipeline.js
import { ServerOrchestrator } from '../../api/_lib/orchestrator.js';
import { generateStage1Id, setStage1Artifact, getStage1Artifact } from '../../api/_lib/db.js';

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

  // 4. Persistence Round-trip Verification
  console.log('\n[Test 4] Stage 1 Persistence & Stage 2 Loading');
  const stage1Id = generateStage1Id('Microsoft');
  await setStage1Artifact(stage1Id, mockStage1Data);
  
  const loaded = await getStage1Artifact(stage1Id);
  if (!loaded || loaded.identity.ticker !== '005930') {
    throw new Error('Persistence round-trip failed: Data mismatch or getStage1Artifact failed');
  }
  
  const orch4 = new ServerOrchestrator('Microsoft', () => {});
  const finalReport4 = await orch4.runStage2Analysis(loaded);
  if (finalReport4.companyName !== 'Microsoft') throw new Error('Persistence execution failed');
  
  console.log('✅ Stage 1 persisted and Stage 2 loaded successfully');

  console.log('\n--- All 2-Stage Pipeline Verifications Passed ---');
}

runTests().catch(err => {
  console.error('\n❌ 2-Stage Verification Failed:', err);
  process.exit(1);
});
