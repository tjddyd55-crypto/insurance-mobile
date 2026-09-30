import type { CoverageInlineAmountField } from './coverageInlineAmount';

export type CoverageActiveInlineEdit =
  | { kind: 'amount'; itemId: string; field: CoverageInlineAmountField }
  | { kind: 'title'; itemId: string }
  | null;

/** @deprecated use CoverageActiveInlineEdit */
export type CoverageInlineAmountEditTarget = Extract<CoverageActiveInlineEdit, { kind: 'amount' }> | null;

export function shouldCommitInlineBeforeNextEdit(
  active: CoverageActiveInlineEdit,
  next: CoverageActiveInlineEdit,
): boolean {
  if (!active || !next) return false;
  if (active.itemId !== next.itemId || active.kind !== next.kind) return true;
  if (active.kind === 'amount' && next.kind === 'amount') {
    return active.field !== next.field;
  }
  return false;
}

export function commitRegisteredInlineEdit(registry: { current: (() => void) | null }): boolean {
  if (!registry.current) return false;
  registry.current();
  return true;
}
