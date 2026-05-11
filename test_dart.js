import { ServerOrchestrator } from './api/_lib/orchestrator.js';

const tests = [
  '삼성전자',
  '005930',
  '대덕전자',
  '두산로보틱스',
  '존재하지 않는 회사명'
];

async function runTests() {
  for (const company of tests) {
    console.log(`\n============================`);
    console.log(`Testing: ${company}`);
    const orchestrator = new ServerOrchestrator(company, () => {}, 'http://localhost:3000');
    
    try {
      // Create an AbortController for the signal
      const controller = new AbortController();
      const signal = controller.signal;

      // Mock internalFetch so it fetches against the actual API files (or we can just skip if it throws, wait: internalFetch hits /api/data/...)
      // But we are in node, there's no http server running. So internalFetch will fail if it tries to hit localhost:3000.
      // We can mock internalFetch to directly call the handler.
      const dartHandler = (await import('./api/_lib/handlers/data/dart.js')).default;
      const dartFinanceHandler = (await import('./api/_lib/handlers/data/dart-finance.js')).default;
      
      orchestrator.internalFetch = async (path) => {
        let handler;
        if (path.startsWith('/api/data/dart-finance')) handler = dartFinanceHandler;
        else if (path.startsWith('/api/data/dart')) handler = dartHandler;
        else throw new Error("Unhandled path in test: " + path);
        
        // Mock req/res
        const req = { url: path, method: 'GET' };
        let statusCode = 200;
        let responseData = null;
        const res = {
          setHeader: () => {},
          status: (code) => { statusCode = code; return res; },
          json: (data) => { responseData = data; return res; },
          end: () => {}
        };
        
        await handler(req, res);
        
        if (statusCode >= 400) {
          throw new Error(responseData?.error || 'Unknown API Error');
        }
        return responseData;
      };

      const resolveRes = await orchestrator.engineResolve(company, signal);
      orchestrator.state.resolve = resolveRes.data;

      await orchestrator.engineData(orchestrator.state.resolve, company, signal);

      const status = orchestrator.metadata.dartStatus;
      console.log(`corpCodeResolved: ${status.corpCodeResolved}`);
      console.log(`resolvedCorpCode: ${status.resolvedCorpCode}`);
      console.log(`resolvedCorpName: ${status.resolvedCorpName}`);
      console.log(`disclosuresCount: ${status.disclosuresCount}`);
      console.log(`financeAvailable: ${status.financeAvailable}`);
      console.log(`financeYears: ${status.financeYears}`);
      console.log(`metadata.dartStatus:`, JSON.stringify(status, null, 2));

    } catch (e) {
      console.error(`Error testing ${company}:`, e.message);
    }
  }
}

runTests();
