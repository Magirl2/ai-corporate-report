import { generateUniqueStage1Id, setUniqueStage1Artifact, getUniqueStage1Artifact } from './api/_lib/db.js';
import fs from 'fs';
import path from 'path';

async function testPipelineSplit() {
  console.log('Testing Stage 1 artifact generation...');
  const stage1Id = generateUniqueStage1Id();
  console.log('Generated ID:', stage1Id);

  if (!stage1Id.startsWith('s1_split:')) {
    throw new Error('ID does not match expected prefix');
  }

  const dummyData = {
    companyName: 'Test Corp',
    ownerEmail: 'test@example.com',
    createdAt: new Date().toISOString(),
    data: {
      identity: { type: 'US', ticker: 'TEST' },
      raw: { searchBriefing: { sentiment: 'Positive' } }
    }
  };

  await setUniqueStage1Artifact(stage1Id, dummyData);
  console.log('Artifact persisted.');

  console.log('Testing Stage 1 artifact retrieval...');
  const loaded = await getUniqueStage1Artifact(stage1Id);
  
  if (!loaded || loaded.companyName !== 'Test Corp') {
    throw new Error('Failed to load artifact or data mismatch');
  }
  
  console.log('Artifact loaded successfully:', loaded.companyName);
  
  console.log('Verifying frontend service no longer calls /api/report/generate...');
  const serviceCode = fs.readFileSync(path.join(process.cwd(), 'src', 'api', 'companyService.js'), 'utf-8');
  
  if (serviceCode.includes("fetch('/api/report/generate'")) {
    throw new Error('Frontend still calls /api/report/generate');
  } else {
    console.log('Frontend correctly avoids calling /api/report/generate');
  }
  
  console.log('All split pipeline tests passed!');
}

testPipelineSplit().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
