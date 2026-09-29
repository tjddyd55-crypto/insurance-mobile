import { buildTelHref, normalizePhone } from '../insuranceContactsModel';

describe('insuranceContactsTel', () => {
  it('builds tel href for common phone formats', () => {
    expect(buildTelHref('010-1234-5678')).toBe('tel:01012345678');
    expect(buildTelHref('02-1234-5678')).toBe('tel:0212345678');
    expect(buildTelHref('1588-1234')).toBe('tel:15881234');
    expect(buildTelHref('070-1234-5678')).toBe('tel:07012345678');
  });

  it('returns null for empty phone numbers', () => {
    expect(buildTelHref('')).toBeNull();
    expect(buildTelHref('   ')).toBeNull();
    expect(normalizePhone('')).toBe('');
  });
});
