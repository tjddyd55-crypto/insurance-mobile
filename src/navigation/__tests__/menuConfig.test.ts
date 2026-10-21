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
      '고객 상담',
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
    expect(secondary).toContain('쿠폰 적용');
  });

  it('marks SMS messaging as PC_ONLY', () => {
    const sms = findMenuLinkByNativePath('/sms/settings');
    expect(sms?.label).toBe('문자 발송');
    expect(sms?.mode).toBe('PC_ONLY');
  });

  it('filters by role', () => {
    expect(filterMenuForRole(USER_APP_MENU, 'USER').length).toBeGreaterThan(0);
    expect(filterMenuForRole(USER_APP_MENU, 'GA_ADMIN')).toEqual([]);
  });

  it('keeps device contacts separate from the customer list and insurer contacts', () => {
    const deviceContacts = findMenuLinkByNativePath('/device-contacts');
    const customers = USER_APP_MENU.find((section) => section.id === 'customers');
    expect(deviceContacts?.label).toBe('연락처');
    expect(deviceContacts?.mode).toBe('NATIVE');
    expect(deviceContacts?.badge).toBeUndefined();
    expect(customers?.children.map((child) => child.id).slice(0, 2)).toEqual([
      'customer-list',
      'device-contacts',
    ]);
    expect(findMenuLinkByNativePath('/insurance/contacts')?.label).toBe('원수사 연락처');
  });

  it('maps native paths and keeps legacyWebPath', () => {
    const item = findMenuLinkByNativePath('/customers');
    expect(item?.label).toBe('고객리스트');
    expect(item?.legacyWebPath).toBe('/customers');
    expect(item?.mode).toBe('NATIVE');
  });

  it('puts the three native screens under 고객 상담', () => {
    const section = USER_APP_MENU.find((entry) => entry.id === 'customer-consulting');
    expect(section?.label).toBe('고객 상담');
    expect(section?.children.map((child) => child.label)).toEqual(['내 바인더', '공유 바인더', '시뮬레이션']);
    expect(section?.children.map((child) => child.nativePath)).toEqual([
      '/customer-consulting/personal-binders',
      '/customer-consulting/shared-binders',
      '/customer-consulting/coverage-simulation',
    ]);
    expect(section?.children.every((child) => child.mode === 'NATIVE')).toBe(true);
  });

  it('marks rent as DISABLED', () => {
    const rent = findMenuLinkByNativePath('/placeholder/rent');
    expect(rent?.mode).toBe('DISABLED');
    expect(rent?.badge).toBe('개발중');
  });
});
