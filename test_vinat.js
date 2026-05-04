import { resolveCorpCode } from './api/_lib/dart-utils.js';

async function test() {
  const dartApiToken = process.env.DART_API_KEY;
  const result = await resolveCorpCode('비나텍', dartApiToken);
  console.log('Result:', result);
}

test();
