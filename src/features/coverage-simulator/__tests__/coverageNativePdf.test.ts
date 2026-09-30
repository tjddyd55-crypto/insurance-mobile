import { buildCoverageNativePdfHtml } from '../coverageNativePdfHtml';
import { buildCoveragePdfFileName } from '../coveragePdfFileName';
import { isPdfByteSignature } from '../nativeCoveragePdf';
import type { CoverageScenario } from '../types';

const baseScenario: CoverageScenario = {
  id: 's1',
  title: '암 치료',
  diseaseType: 'cancer',
  description: '',
  customerNameSnapshot: '홍길동',
  consultationDate: '2026-03-30T00:00:00.000Z',
  items: [
    {
      id: 'i1',
      type: 'coverage',
      category: 'diagnosis',
      label: '암 진단금',
      currentAmount: 10_000_000,
      proposedAmount: 30_000_000,
      order: 0,
    },
  ],
  createdAt: '',
  updatedAt: '',
};

describe('coverageNativePdf', () => {
  it('builds pdf file name with customer and .pdf extension', () => {
    expect(buildCoveragePdfFileName(baseScenario)).toMatch(/\.pdf$/);
    expect(buildCoveragePdfFileName(baseScenario)).toContain('홍길동');
  });

  it('renders scenario snapshot fields into printable html', () => {
    const html = buildCoverageNativePdfHtml(baseScenario);
    expect(html).toContain('보장 시뮬레이션');
    expect(html).toContain('암 진단금');
    expect(html).toContain('홍길동');
    expect(html).toContain('제안 총보장');
  });

  it('validates pdf byte signature', () => {
    expect(isPdfByteSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(isPdfByteSignature(new Uint8Array([1, 2, 3]))).toBe(false);
  });
});
