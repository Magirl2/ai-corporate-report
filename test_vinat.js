import { resolveCorpCode } from './api/_lib/dart-utils.js';

async function test() {
  const dartApiToken = process.env.DART_API_KEY || '98c7f5eef7673f915ae614cb61a339afa5684fa3';
  const result = await resolveCorpCode('비나텍', dartApiToken);
  console.log('Result:', result);
}

test();
