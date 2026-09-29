import { formatProfileOrganization, formatProfileRole } from '../profilePresentation';

describe('profilePresentation', () => {
  test('역할 코드를 사용자 용어로 표시한다', () => {
    expect(formatProfileRole('USER')).toBe('설계사');
    expect(formatProfileRole('GA_ADMIN')).toBe('GA 관리자');
  });

  test('소속 이름이 없으면 코드만 사용한다', () => {
    expect(formatProfileOrganization('', 'GA-001')).toBe('GA-001');
  });
});
