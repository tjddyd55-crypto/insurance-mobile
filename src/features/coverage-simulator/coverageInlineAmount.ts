import { parseManWonInput } from './coverageAnalysis';

export type CoverageInlineAmountField = 'current' | 'proposed';

export function coverageInlineAmountPatch(
  field: CoverageInlineAmountField,
  rawInput: string,
): { currentAmount?: number | null; proposedAmount?: number | null } {
  const amount = parseManWonInput(rawInput);
  return field === 'current' ? { currentAmount: amount } : { proposedAmount: amount };
}
