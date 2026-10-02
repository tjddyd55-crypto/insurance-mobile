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

/** 금액 칸을 키보드 위로 올리는 자동 스크롤이 끝난 뒤에도 포커스를 유지한다. */
export const INLINE_EDIT_FOCUS_GUARD_MS = 500;

export function inlineEditBlurGuardDeadline(now: number): number {
  return now + INLINE_EDIT_FOCUS_GUARD_MS;
}

export function shouldIgnoreInlineEditBlur(ignoreUntil: number, now: number): boolean {
  return now < ignoreUntil;
}

/** 사용자가 끈 스크롤만 편집을 닫는다. scrollTo 로 시작한 스크롤은 닫지 않는다. */
export function shouldCommitInlineEditOnScroll(programmaticScroll: boolean): boolean {
  return !programmaticScroll;
}
