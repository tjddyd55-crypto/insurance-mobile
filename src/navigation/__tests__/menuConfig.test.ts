import {
  USER_APP_MENU,
  filterMenuForRole,
  findMenuLinkByNativePath,
  listPrimaryMenuLabels,
  listSecondaryMenuLabels,
} from '../../navigation/menuConfig';

describe('menuConfig', () => {
  it('keeps USER primary menu labels in source order', () => {
    expect(listPrimaryMenuLabels()).toEqual([
      '할일 및 알림',
      '고객관리',
      '소식지',
      '신청서',
      '팀관리',
      '업무편의',
      '내정보',
    ]);
  });

  it('includes expected secondary labels', () => {
    const secondary = listSecondaryMenuLabels();
    expect(secondary).toContain('오늘의 TA');
    expect(secondary).toContain('고객리스트');
    expect(secondary).toContain('문자 발송');
    expect(secondary).toContain('구독 및 결제');
  });

  it('filters by role', () => {
    expect(filterMenuForRole(USER_APP_MENU, 'USER').length).toBeGreaterThan(0);
    expect(filterMenuForRole(USER_APP_MENU, 'GA_ADMIN')).toEqual([]);
  });

  it('maps native paths and keeps legacyWebPath', () => {
    const item = findMenuLinkByNativePath('/customers');
    expect(item?.label).toBe('고객리스트');
    expect(item?.legacyWebPath).toBe('/customers');
    expect(item?.mode).toBe('NATIVE');
  });

  it('marks rent as DISABLED', () => {
    const rent = findMenuLinkByNativePath('/placeholder/rent');
    expect(rent?.mode).toBe('DISABLED');
    expect(rent?.badge).toBe('개발중');
  });
});
