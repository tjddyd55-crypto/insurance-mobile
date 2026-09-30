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

describe('coverage pdf file name', () => {
  it('joins the customer and the simulation title', () => {
    expect(
      buildCoveragePdfFileName({ ...baseScenario, title: '암치료플랜' }),
    ).toBe('홍길동_암치료플랜.pdf');
  });

  it('uses only the simulation title when the customer name is missing', () => {
    expect(
      buildCoveragePdfFileName({
        ...baseScenario,
        title: '암치료플랜',
        customerNameSnapshot: null,
        customerName: undefined,
      }),
    ).toBe('암치료플랜.pdf');
  });

  it('skips an empty simulation title when a customer name exists', () => {
    expect(buildCoveragePdfFileName({ ...baseScenario, title: '   ' })).toBe('홍길동.pdf');
  });

  it('falls back when both names are missing', () => {
    expect(
      buildCoveragePdfFileName({
        ...baseScenario,
        title: '',
        customerNameSnapshot: '   ',
        customerName: undefined,
      }),
    ).toBe('보장시뮬레이션.pdf');
  });

  it('keeps Korean, strips invalid characters, and collapses whitespace', () => {
    expect(
      buildCoveragePdfFileName({
        ...baseScenario,
        customerNameSnapshot: '홍  길동/김',
        title: '암\\치료:플랜*\u0000',
      }),
    ).toBe('홍 길동김_암치료플랜.pdf');
  });

  it('uses customerName when the snapshot is empty and caps each part', () => {
    const longName = '가'.repeat(50);
    expect(
      buildCoveragePdfFileName({
        ...baseScenario,
        customerNameSnapshot: '',
        customerName: longName,
        title: longName,
      }),
    ).toBe(`${'가'.repeat(40)}_${'가'.repeat(40)}.pdf`);
  });

  it('does not include the consultation date', () => {
    const fileName = buildCoveragePdfFileName({
      ...baseScenario,
      title: '암치료플랜',
      consultationDate: '2026-10-01T00:00:00.000Z',
    });
    expect(fileName).toBe('홍길동_암치료플랜.pdf');
    expect(fileName).not.toContain('2026');
    expect(fileName).not.toContain('__');
  });
});

describe('coverageNativePdf', () => {

  it('renders scenario snapshot fields into printable html', () => {
    const html = buildCoverageNativePdfHtml(baseScenario);
    expect(html).toContain('보장 시뮬레이션');
    expect(html).toContain('암 진단금');
    expect(html).toContain('홍길동');
    expect(html).toContain('제안 총보장');
    expect(html).toContain('class="coverage-name"');
    expect(html).toContain('margin: 0 52px');
    expect(html).toContain('th, td.amount { width: 50%; }');
    expect(html).toContain('td.amount { text-align: center;');
    expect(html).toContain('.period-values > span { flex: 1; text-align: center; }');
    expect(html).toContain('.totals > span { flex: 1; text-align: center; }');
    expect(html).not.toContain('↑');
    expect(html).not.toContain('colspan="4"');
  });

  it('validates pdf byte signature', () => {
    expect(isPdfByteSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(isPdfByteSignature(new Uint8Array([1, 2, 3]))).toBe(false);
  });
});
