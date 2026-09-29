import { resolveNewsletterPostAuthorLabel } from '../utils/resolveNewsletterPostAuthorLabel';

describe('resolveNewsletterPostAuthorLabel', () => {
  it('prefers authorDisplayName when it differs from board label', () => {
    expect(
      resolveNewsletterPostAuthorLabel({
        authorDisplayName: 'DB손보',
        boardLabel: '원수사 소식지',
        legacyAuthorLabel: 'dbfire',
      }),
    ).toBe('DB손보');
  });

  it('does not use board label as fallback', () => {
    expect(
      resolveNewsletterPostAuthorLabel({
        boardLabel: '손해사정사 소식지',
      }),
    ).toBe('—');
  });
});
