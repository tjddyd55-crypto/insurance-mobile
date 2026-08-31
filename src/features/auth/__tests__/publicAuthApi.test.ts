import { normalizePhone, validatePassword, validateUsername } from '../publicAuthApi';

describe('publicAuthApi validation', () => {
  test('normalizes Korean phone inputs', () => {
    expect(normalizePhone('010-1234-5678')).toBe('01012345678');
  });

  test('applies the server username rule', () => {
    expect(validateUsername('ab')).toContain('3~30');
    expect(validateUsername('has space')).toContain('3~30');
    expect(validateUsername('valid_user')).toBeNull();
  });

  test('applies the server password length rule', () => {
    expect(validatePassword('123')).toContain('4~100');
    expect(validatePassword('1234')).toBeNull();
  });
});
