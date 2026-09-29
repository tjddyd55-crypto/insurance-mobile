import { formatProfilePhone, normalizeProfile, validateProfilePhone } from '../profileModel';

describe('profileModel', () => {
  test('normalizes server snake_case fields', () => {
    const profile = normalizeProfile({
      id: 'u1', username: 'agent', display_name: '홍길동', phone_number: '010-1234-5678', ga_id: 3,
    });
    expect(profile.displayName).toBe('홍길동');
    expect(profile.phoneNumber).toBe('01012345678');
    expect(profile.gaId).toBe(3);
  });

  test('formats and validates Korean mobile numbers', () => {
    expect(formatProfilePhone('01012345678')).toBe('010-1234-5678');
    expect(validateProfilePhone('010-1234-5678')).toBeNull();
    expect(validateProfilePhone('02-123-4567')).toContain('휴대폰');
  });
});
