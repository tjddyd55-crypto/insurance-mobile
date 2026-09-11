import { EMPTY_CUSTOMER_FORM } from '../customerForm';
import {
  cloneCustomerFormState,
  createCustomerFormSnapshot,
  decideCloseEdit,
  isCustomerFormDirty,
  shouldEnableCustomerEditSave,
} from '../customerFormDraft';

describe('customerFormDraft', () => {
  it('clones so nested edits do not mutate the original snapshot source', () => {
    const original = cloneCustomerFormState(EMPTY_CUSTOMER_FORM);
    const snapshot = createCustomerFormSnapshot(original);
    const draft = cloneCustomerFormState(original);

    draft.name = '홍길동';
    draft.businessInfo.representativeName = '대표';
    draft.accountNumber = '123-456';

    expect(original.name).toBe('');
    expect(original.businessInfo.representativeName).toBe('');
    expect(original.accountNumber).toBe('');
    expect(isCustomerFormDirty(draft, snapshot)).toBe(true);
    expect(isCustomerFormDirty(original, snapshot)).toBe(false);
  });

  it('treats deep-equal drafts as not dirty even when object identity differs', () => {
    const a = cloneCustomerFormState(EMPTY_CUSTOMER_FORM);
    const b = cloneCustomerFormState(a);
    const snapshot = createCustomerFormSnapshot(a);
    expect(a).not.toBe(b);
    expect(isCustomerFormDirty(b, snapshot)).toBe(false);
  });

  it('enables save only when initialized, dirty, and not saving', () => {
    expect(
      shouldEnableCustomerEditSave({ initialized: true, dirty: true, saving: false }),
    ).toBe(true);
    expect(
      shouldEnableCustomerEditSave({ initialized: true, dirty: false, saving: false }),
    ).toBe(false);
    expect(
      shouldEnableCustomerEditSave({ initialized: false, dirty: true, saving: false }),
    ).toBe(false);
    expect(
      shouldEnableCustomerEditSave({ initialized: true, dirty: true, saving: true }),
    ).toBe(false);
  });

  it('close decision: clean leaves, dirty confirms, saving blocks (no auto-save)', () => {
    expect(decideCloseEdit({ dirty: false, saving: false })).toBe('leave');
    expect(decideCloseEdit({ dirty: true, saving: false })).toBe('confirm');
    expect(decideCloseEdit({ dirty: true, saving: true })).toBe('block');
    expect(decideCloseEdit({ dirty: false, saving: true })).toBe('block');
  });

  it('discard model: restoring clone of original clears dirty without needing API', () => {
    const original = cloneCustomerFormState({
      ...EMPTY_CUSTOMER_FORM,
      name: '원본고객',
      accountNumber: '111',
    });
    const snapshot = createCustomerFormSnapshot(original);
    let draft = cloneCustomerFormState(original);
    draft = { ...draft, name: '수정고객', accountNumber: '999' };
    expect(isCustomerFormDirty(draft, snapshot)).toBe(true);

    // 저장안함: restore original clone — no PATCH implied
    draft = cloneCustomerFormState(original);
    expect(isCustomerFormDirty(draft, snapshot)).toBe(false);
    expect(draft.name).toBe('원본고객');
    expect(draft.accountNumber).toBe('111');
  });
});