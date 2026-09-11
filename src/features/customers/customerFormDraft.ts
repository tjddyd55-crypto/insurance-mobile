import type { CustomerFormState } from './customerForm';

/** Deep-clone form state so draft never shares refs with React Query cache. */
export function cloneCustomerFormState(form: CustomerFormState): CustomerFormState {
  return JSON.parse(JSON.stringify(form)) as CustomerFormState;
}

/** Stable snapshot for dirty comparison (normalize then stringify). */
export function createCustomerFormSnapshot(form: CustomerFormState): string {
  return JSON.stringify(normalizeCustomerFormForCompare(form));
}

export function isCustomerFormDirty(
  draft: CustomerFormState,
  originalSnapshot: string | null | undefined,
): boolean {
  if (!originalSnapshot) return false;
  return createCustomerFormSnapshot(draft) !== originalSnapshot;
}

export type CloseEditDecision = 'leave' | 'confirm' | 'block';

/** SSOT for cancel / header back / hardware back. Never auto-save. */
export function decideCloseEdit(options: {
  dirty: boolean;
  saving: boolean;
}): CloseEditDecision {
  if (options.saving) return 'block';
  return options.dirty ? 'confirm' : 'leave';
}

export function shouldEnableCustomerEditSave(options: {
  initialized: boolean;
  dirty: boolean;
  saving: boolean;
}): boolean {
  return options.initialized && options.dirty && !options.saving;
}

function normalizeCustomerFormForCompare(form: CustomerFormState): unknown {
  return stableNormalize(form);
}

function stableNormalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      out[key] = stableNormalize(input[key]);
    }
    return out;
  }
  return String(value);
}