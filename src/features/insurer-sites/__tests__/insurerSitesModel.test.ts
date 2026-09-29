import { insurerInitials, insurerLogoUrl, normalizeInsurerSite, safeExternalUrl } from '../insurerSitesModel';

describe('insurerSitesModel', () => {
  test('normalizes API fields', () => {
    expect(normalizeInsurerSite({ id: 1, category: 'life', name: '생명보험', sales_url: 'https://example.com' })).toMatchObject({ id: 1, category: 'life', salesUrl: 'https://example.com' });
  });
  test('only accepts http external links', () => {
    expect(safeExternalUrl('https://example.com')).toBe('https://example.com/');
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('not a url')).toBeNull();
  });
  test('only resolves self-hosted logo paths and provides initials', () => {
    expect(insurerLogoUrl('https://other/logo.png')).toBeNull();
    expect(insurerLogoUrl('//other/logo.png')).toBeNull();
    expect(insurerInitials('현대해상')).toBe('현대');
  });
});
