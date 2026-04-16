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
const apiKey = process.env.DART_API_KEY;

import { resolveCorpCode, normalizeCorpName } from './api/_lib/dart-utils.js';

async function test(name) {
  console.log(`\nTesting: "${name}"`);
  console.log(`Normalized: "${normalizeCorpName(name)}"`);
  const res = await resolveCorpCode(name, apiKey);
  if (res) {
    console.log(`SUCCESS: Resolved to "${res.corpName}" (${res.corpCode}) via ${res.method}`);
  } else {
    console.log(`FAILED: Could not resolve.`);
  }
}

async function main() {
  await test('삼천당 제약');
  await test('삼천당제약');
  await test('삼성전자');
}

main();
