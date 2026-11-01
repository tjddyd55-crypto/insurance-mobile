import { HIDDEN_CONTACTS_MENU_PATHS, isContactsNavEntryHidden } from '../menuConfig';
import { buildNativeMenuForSession } from '../nativeMenuPolicy';
import type { AuthUser } from '../../api/authApi';

const user = { id: 1, role: 'USER', email: 'u@example.com', name: 'u' } as unknown as AuthUser;

describe('업무편의 원수사 연락처 노출', () => {
  it('업무편의 섹션에 원수사 연락처(/insurance/contacts)가 보인다', () => {
    const section = buildNativeMenuForSession(user, { isTeamOwner: false }).find((s) => s.id === 'convenience');
    const link = section?.children.find((c) => c.id === 'insurance-contacts');
    expect(link).toMatchObject({ label: '원수사 연락처', nativePath: '/insurance/contacts', mode: 'NATIVE' });
  });
  it('나머지 3개 숨김 경로는 그대로 숨김', () => {
    expect([...HIDDEN_CONTACTS_MENU_PATHS]).toEqual(['/contacts', '/insurance/company-registry', '/contacts/manage']);
    expect(isContactsNavEntryHidden('/insurance/contacts')).toBe(false);
    for (const p of ['/contacts', '/contacts/manage', '/insurance/company-registry', '/contacts/abc']) {
      expect(isContactsNavEntryHidden(p)).toBe(true);
    }
    const paths = buildNativeMenuForSession(user, { isTeamOwner: false }).flatMap((s) => s.children.map((c) => c.nativePath));
    expect(paths.filter((p) => isContactsNavEntryHidden(p))).toEqual([]);
  });
});
