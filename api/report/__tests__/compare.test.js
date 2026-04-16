import { describe, it, expect } from 'vitest';
import { buildComparePayload } from '../compare.js';

describe('compare route shaping', () => {
  it('buildComparePayload constructs the correct NDJSON success shape', () => {
    const mockDataA = { companyName: 'Company A', score: 90 };
    const mockDataB = { companyName: 'Company B', score: 85 };
    
    const payload = buildComparePayload(mockDataA, mockDataB);
    
    expect(payload.type).toBe('success');
    expect(payload.data.dataA.companyName).toBe('Company A');
    expect(payload.data.dataA.score).toBe(90);
    expect(payload.data.dataB.companyName).toBe('Company B');
    expect(payload.data.dataB.score).toBe(85);
  });
});
