// @ts-nocheck
const fs = require('fs');
const path = require('path');

const {
  COVERAGE_SHARE_COPY,
  coverageShareSnapshotFingerprint,
} = require('../coverageShareModel');

describe('useCoverageShareSession direct copy contract', () => {
  it('exposes copyShareLink without clearing cached url on dialog open', () => {
    const src = fs.readFileSync(path.join(__dirname, '../useCoverageShareSession.ts'), 'utf8');
    expect(src).toMatch(/copyShareLink/);
    expect(src).toMatch(/sharedSnapshotFingerprintRef/);
    expect(src).not.toMatch(/setShareUrl\(null\)/);
    expect(src).not.toMatch(/shareUrlRef\.current = null/);
  });

  it('uses simplified copied toast copy', () => {
    expect(COVERAGE_SHARE_COPY.copied).toBe('복사되었습니다.');
  });

  it('screen calls copyShareLink directly and does not mount share dialog', () => {
    const src = fs.readFileSync(path.join(__dirname, '../CoverageSimulationScreen.tsx'), 'utf8');
    expect(src).toMatch(/share\.copyShareLink\(\)/);
    expect(src).not.toMatch(/CoverageShareDialog/);
    expect(src).not.toMatch(/share\.openShare/);
  });
});

describe('coverageShareSnapshotFingerprint', () => {
  it('changes when scenario items change', () => {
    const base = {
      id: 's1',
      title: 't',
      diseaseType: 'cancer',
      items: [
        {
          id: '1',
          type: 'coverage',
          order: 0,
          label: 'a',
          category: 'diagnosis',
          currentAmount: 1,
          proposedAmount: 2,
        },
      ],
    };
    const fp1 = coverageShareSnapshotFingerprint(base);
    const fp2 = coverageShareSnapshotFingerprint({
      ...base,
      items: [{ ...base.items[0], proposedAmount: 3 }],
    });
    expect(fp1).not.toBe(fp2);
  });
});
