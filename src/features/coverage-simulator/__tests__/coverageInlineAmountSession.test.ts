import {
  commitRegisteredInlineEdit,
  shouldCommitInlineBeforeNextEdit,
} from '../coverageInlineAmountSession';

describe('coverageInlineAmountSession', () => {
  it('commits before switching to another inline target', () => {
    expect(
      shouldCommitInlineBeforeNextEdit(
        { kind: 'amount', itemId: 'a', field: 'current' },
        { kind: 'amount', itemId: 'a', field: 'proposed' },
      ),
    ).toBe(true);
    expect(
      shouldCommitInlineBeforeNextEdit(null, { kind: 'amount', itemId: 'a', field: 'current' }),
    ).toBe(false);
    expect(
      shouldCommitInlineBeforeNextEdit({ kind: 'amount', itemId: 'a', field: 'current' }, null),
    ).toBe(false);
  });

  it('commits before switching between amount and title on the same item', () => {
    expect(
      shouldCommitInlineBeforeNextEdit(
        { kind: 'amount', itemId: 'a', field: 'current' },
        { kind: 'title', itemId: 'a' },
      ),
    ).toBe(true);
    expect(
      shouldCommitInlineBeforeNextEdit(
        { kind: 'title', itemId: 'a' },
        { kind: 'amount', itemId: 'a', field: 'proposed' },
      ),
    ).toBe(true);
  });

  it('runs registered commit handler', () => {
    const registry = { current: null as (() => void) | null };
    expect(commitRegisteredInlineEdit(registry)).toBe(false);
    let called = 0;
    registry.current = () => {
      called += 1;
    };
    expect(commitRegisteredInlineEdit(registry)).toBe(true);
    expect(called).toBe(1);
  });
});
