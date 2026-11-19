import { formatProfileOrganization, formatProfileRole } from '../profilePresentation';

describe('profilePresentation', () => {
  test('역할 코드를 사용자 용어로 표시한다', () => {
    expect(formatProfileRole('USER')).toBe('설계사');
    expect(formatProfileRole('GA_ADMIN')).toBe('GA 관리자');
  });

  test('소속 이름이 없으면 코드만 사용한다', () => {
    expect(formatProfileOrganization('', 'GA-001')).toBe('GA-001');
    expect(formatProfileOrganization()).toBe('소속 정보 없음');
  });

  test.each([
    ['apple_review', 'PLAY_REVIEW', 'Google Play Review', 'Apple App Review'],
    ['agent', ' play_review ', 'Google Play Review', '심사용 계정'],
    ['agent', 'YJASSET', ' 영진에셋 ', '영진에셋'],
  ])('%s 계정의 소속 이름을 표시한다', (username, code, name, expected) => {
    expect(formatProfileOrganization(name, code, username)).toBe(expected);
  });
});
