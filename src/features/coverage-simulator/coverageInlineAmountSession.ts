export {
  type CoverageActiveInlineEdit,
  type CoverageInlineAmountEditTarget,
  INLINE_EDIT_FOCUS_GUARD_MS,
  commitRegisteredInlineEdit,
  commitRegisteredInlineEdit as commitRegisteredInlineAmount,
  inlineEditBlurGuardDeadline,
  shouldCommitInlineBeforeNextEdit,
  shouldCommitInlineEditOnScroll,
  shouldIgnoreInlineEditBlur,
} from './coverageInlineEdit';
