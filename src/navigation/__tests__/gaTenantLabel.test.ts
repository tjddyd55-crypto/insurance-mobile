import { formatGaBannerLabel, resolveDisplayGaName } from '../gaTenantLabel';

describe('resolveDisplayGaName', () => {
  it.each([
    [' Apple_Review ', 'PLAY_REVIEW', 'Google Play Review', 'Apple App Review'],
    ['google_review', 'PLAY_REVIEW', 'Google Play Review', '심사용 계정'],
    ['agent', ' play_review ', 'Google Play Review', '심사용 계정'],
    ['agent', 'YJASSET', ' 영진에셋 ', '영진에셋'],
    ['agent', 'YJASSET', ' ', ''],
  ])('resolves the display name for %s in %s', (username, code, name, expected) => {
    expect(resolveDisplayGaName(name, code, username)).toBe(expected);
  });
});

describe('formatGaBannerLabel', () => {
  it('uses the review tenant labels without adding a GA suffix', () => {
    expect(formatGaBannerLabel('Google Play Review', 'PLAY_REVIEW', 'apple_review')).toBe('Apple App Review');
    expect(formatGaBannerLabel('', '', 'google_review')).toBe('심사용 계정');
    expect(formatGaBannerLabel('Google Play Review', ' play_review ', 'agent')).toBe('심사용 계정');
  });

  it('adds the GA suffix exactly once', () => {
    expect(formatGaBannerLabel('영진에셋', 'YJASSET', 'agent')).toBe('영진에셋 GA');
    expect(formatGaBannerLabel('테스트 GA', 'TEST', 'agent')).toBe('테스트 GA');
  });
});
