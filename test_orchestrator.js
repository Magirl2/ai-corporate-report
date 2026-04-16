import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...valParts] = line.split('=');
  if (key && valParts.length > 0) {
    let val = valParts.join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[key.trim()] = val;
  }
});

import { ServerOrchestrator } from './api/_lib/orchestrator.js';

async function testCompany(name) {
  console.log(`\n\n--- Testing ${name} ---`);
  const orchestrator = new ServerOrchestrator(name, (status) => console.log(`[Status] ${status}`), 'http://localhost:3000', console);
  try {
    const report = await orchestrator.run();
    console.log(`Score: ${report.score}, Iterations: ${report.iteration}`);
    console.log(`Financial Overview Summary:`, report.report.financialAnalysis?.overview?.summary);
    console.log(`Financial Overview Detail:`, report.report.financialAnalysis?.overview?.detail?.substring(0, 100));
    console.log(`Macro Trend Summary:`, report.report.macroTrend?.summary);
    console.log(`Number of News items:`, report.report.recentNews?.length);
    console.log(`Search Briefing output keys:`, Object.keys(orchestrator.state.raw.searchBriefing));
    console.log(`Errors:`, report.debug.agentErrors);
    console.log(`\n`);
  } catch (err) {
    console.error(`Error testing ${name}`, err);
  }
}

async function main() {
  await testCompany('삼천당 제약');
  await testCompany('삼성전자');
  await testCompany('Apple');
}

main();
