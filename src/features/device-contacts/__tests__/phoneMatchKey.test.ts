import {
  DEVICE_CONTACT_PHONE_EXCLUSION_POLICY,
  foldKoreaCountryCode,
  normalizeDeviceContactMatchKey,
  phoneSearchNeedles,
  stripCrmPhoneDigits,
  uniqueMatchKeys,
} from '../phoneMatchKey';

describe('device contact phone match key', () => {
  it('follows the CRM digits-only rule before the Korea country-code fold', () => {
    expect(stripCrmPhoneDigits('010-1234-5678')).toBe('01012345678');
    expect(stripCrmPhoneDigits(' 010 1234 5678 ')).toBe('01012345678');
    expect(normalizeDeviceContactMatchKey('010-1234-5678')).toBe('01012345678');
    expect(normalizeDeviceContactMatchKey('01012345678')).toBe('01012345678');
    expect(normalizeDeviceContactMatchKey('+82 10 1234 5678')).toBe('01012345678');
    expect(normalizeDeviceContactMatchKey('82-010-1234-5678')).toBe('01012345678');
    expect(foldKoreaCountryCode('821012345678')).toBe('01012345678');
  });

  it('drops empty and invalid numbers', () => {
    expect(normalizeDeviceContactMatchKey('')).toBeNull();
    expect(normalizeDeviceContactMatchKey('   ')).toBeNull();
    expect(normalizeDeviceContactMatchKey('전화없음')).toBeNull();
    expect(normalizeDeviceContactMatchKey('12345')).toBeNull();
    expect(normalizeDeviceContactMatchKey('1'.repeat(16))).toBeNull();
    expect(DEVICE_CONTACT_PHONE_EXCLUSION_POLICY).toContain('8자리 미만');
  });

  it('splits several numbers stored in one customer field', () => {
    expect(uniqueMatchKeys(['010-1234-5678 / 01099998888'])).toEqual([
      '01012345678',
      '01099998888',
    ]);
  });

  it('searches a full +82 query against the domestic key', () => {
    expect(phoneSearchNeedles('+82 10 1234 5678')).toContain('01012345678');
    expect(phoneSearchNeedles('010-1234')).toEqual(['0101234']);
  });
});
