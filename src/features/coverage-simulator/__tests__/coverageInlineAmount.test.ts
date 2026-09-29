import { coverageInlineAmountPatch } from '../coverageInlineAmount';

describe('coverageInlineAmountPatch', () => {
  it('maps current field to currentAmount in won', () => {
    expect(coverageInlineAmountPatch('current', '300')).toEqual({ currentAmount: 3_000_000 });
  });

  it('maps proposed field to proposedAmount', () => {
    expect(coverageInlineAmountPatch('proposed', '1,500')).toEqual({ proposedAmount: 15_000_000 });
  });

  it('empty input becomes null', () => {
    expect(coverageInlineAmountPatch('current', '')).toEqual({ currentAmount: null });
    expect(coverageInlineAmountPatch('proposed', '   ')).toEqual({ proposedAmount: null });
  });
});
