import { formatGaBannerLabel } from '../gaTenantLabel';

describe('formatGaBannerLabel', () => {
  it('uses the fixed Play review tenant label', () => {
    expect(formatGaBannerLabel('', '', 'google_review')).toBe('Google Play Review');
  });

  it('adds the GA suffix exactly once', () => {
    expect(formatGaBannerLabel('영진에셋', 'YJASSET', 'agent')).toBe('영진에셋 GA');
    expect(formatGaBannerLabel('테스트 GA', 'TEST', 'agent')).toBe('테스트 GA');
  });
});
