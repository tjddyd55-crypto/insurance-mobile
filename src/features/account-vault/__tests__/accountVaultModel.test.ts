import { maskSecret, normalizeAccountVaultRow } from '../accountVaultModel';
describe('accountVaultModel', () => {
  test('normalizes the private account API contract', () => { expect(normalizeAccountVaultRow({ id: 'a1', category: 'LIFE', company_name: 'A생명', login_id: 'user', login_password: 'secret' })).toMatchObject({ id: 'a1', companyName: 'A생명', loginId: 'user', loginPassword: 'secret' }); });
  test('masks secrets without leaking their content', () => { expect(maskSecret('password')).toBe('••••••••'); expect(maskSecret('')).toBe('미등록'); });
});
