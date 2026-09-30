import type { CoverageInlineAmountEditTarget } from './CoverageTimeline';

/** inline edit 중 다른 action 전에 commit이 필요한지 */
export function shouldCommitInlineBeforeNextEdit(
  active: CoverageInlineAmountEditTarget,
  next: CoverageInlineAmountEditTarget,
): boolean {
  if (!active || !next) return false;
  return active.itemId !== next.itemId || active.field !== next.field;
}

/** 등록된 active input commit (없으면 no-op) */
export function commitRegisteredInlineAmount(registry: { current: (() => void) | null }): boolean {
  if (!registry.current) return false;
  registry.current();
  return true;
}
