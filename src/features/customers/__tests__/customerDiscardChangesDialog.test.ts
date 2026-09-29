import { CUSTOMER_DISCARD_CHANGES_DIALOG_COPY } from '../CustomerDiscardChangesDialog';

describe('CustomerDiscardChangesDialog', () => {
  it('exposes only continue-editing and discard actions (no save)', () => {
    const actions = [
      CUSTOMER_DISCARD_CHANGES_DIALOG_COPY.continueEditing,
      CUSTOMER_DISCARD_CHANGES_DIALOG_COPY.discard,
    ];
    expect(actions).toHaveLength(2);
    expect(actions).not.toContain('저장');
    expect(actions).not.toContain('저장안함');
    expect(CUSTOMER_DISCARD_CHANGES_DIALOG_COPY.title).toBe('수정을 취소할까요?');
    expect(CUSTOMER_DISCARD_CHANGES_DIALOG_COPY.body).toBe(
      '변경한 내용은 저장되지 않습니다.',
    );
  });
});
