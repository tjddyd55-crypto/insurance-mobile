import type { AuthUser, UserRole } from '../../api/authApi';
import {
  buildNativeMenuForSession,
  isExpiredNativePathAllowed,
  isPublicAccountGaOnlyPath,
  type NativeMenuCapabilities,
} from '../nativeMenuPolicy';

const capabilities: NativeMenuCapabilities = {
  isTeamOwner: false,
  dynamicNewsletterBoards: undefined,
};

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    username: 'designer01',
    role: 'USER',
    gaId: 1,
    gaCode: 'TEST',
    gaName: 'Test GA',
    companyId: null,
    displayName: '테스트 사용자',
    teamId: 'team-1',
    tenantCode: '',
    subscription: {
      plan: 'FREE',
      effectiveStatus: 'ACTIVE',
      startedAt: null,
      expiresAt: null,
      remainingDays: null,
      reason: 'free',
      policyActive: true,
    },
    ...overrides,
  };
}

function labels(menu: ReturnType<typeof buildNativeMenuForSession>): string[] {
  return menu.flatMap((section) => section.children.map((child) => child.label));
}

describe('native session menu policy', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.EXPO_PUBLIC_FREE_LAUNCH_HIDE_BILLING_UI = 'false';
    process.env.EXPO_PUBLIC_BILLING_REVIEW_ACCESS_ENABLED = 'true';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('keeps the USER section and link order aligned with Web', () => {
    const menu = buildNativeMenuForSession(user(), capabilities);
    expect(menu.map((section) => section.label)).toEqual([
      '할일 및 알림',
      '고객관리',
      '소식지',
      '신청서',
      '팀관리',
      '업무편의',
      '내정보',
    ]);
    expect(labels(menu)).toEqual([
      '오늘의 TA', '할일', '메모', '알림',
      '고객리스트', '고객 지도', '카드 수납', '고객소식지', '청구관리',
      '원수사소식지', '손해사정사 소식지',
      '신청서 작성', '신청서 작성내역', '렌트(사고대차)',
      '팀원리스트', '팀 게시판', '팀 자료',
      '원수사 연락처', '계정관리', '설계사이트',
      '내 저장공간', '내정보관리', '구독 및 결제', '문의요청',
    ]);
  });

  test.each<UserRole>([
    'GA_ADMIN',
    'GA_STAFF',
    'INSURER_MANAGER',
    'LOSS_ADJUSTER',
  ])('does not expose unsupported Web-only routes to %s', (role) => {
    expect(buildNativeMenuForSession(user({ role }), capabilities)).toEqual([]);
  });

  test('keeps the Native CRM menu available to a SUPER_ADMIN QA session', () => {
    const menu = buildNativeMenuForSession(user({ role: 'SUPER_ADMIN' }), {
      isTeamOwner: false,
      dynamicNewsletterBoards: undefined,
    });

    expect(menu.map((section) => section.label)).toEqual([
      '할일 및 알림',
      '고객관리',
      '소식지',
      '신청서',
      '팀관리',
      '업무편의',
      '내정보',
    ]);
    expect(labels(menu)).toHaveLength(24);
  });

  test('injects team management only for the team owner', () => {
    expect(labels(buildNativeMenuForSession(user(), capabilities))).not.toContain('팀 관리');
    const ownerMenu = buildNativeMenuForSession(user(), {
      ...capabilities,
      isTeamOwner: true,
    });
    expect(labels(ownerMenu).slice(14, 18)).toEqual([
      '팀원리스트',
      '팀 게시판',
      '팀 자료',
      '팀 관리',
    ]);
  });

  test('injects dynamic newsletter boards while keeping loss-adjuster on fixed path', () => {
    const menu = buildNativeMenuForSession(user(), {
      ...capabilities,
      dynamicNewsletterBoards: [
        { label: '보상 실무 자료', slug: 'loss', boardScope: 'ga', systemKey: 'LOSS_ADJUSTER' },
        { label: '영진서울중앙', slug: 'yeongjin', boardScope: 'ga' },
      ],
    });
    expect(labels(menu)).toContain('보상 실무 자료');
    expect(labels(menu)).not.toContain('손해사정사 소식지');
    expect(labels(menu)).toContain('영진서울중앙');
    const yeongjin = menu
      .flatMap((section) => section.children)
      .find((child) => child.id === 'newsletter-board-yeongjin');
    expect(yeongjin?.nativePath).toBe('/portal/boards/yeongjin');
  });

  test('hides adjuster-news when loaded boards omit LOSS_ADJUSTER', () => {
    const menu = buildNativeMenuForSession(user(), {
      isTeamOwner: false,
      dynamicNewsletterBoards: [{ label: '영진', slug: 'yeongjin', boardScope: 'ga' }],
    });
    expect(labels(menu)).not.toContain('손해사정사 소식지');
    expect(labels(menu)).toContain('영진');
  });

  test('limits expired sessions to profile, billing, and inquiry routes', () => {
    const menu = buildNativeMenuForSession(user({
      subscription: {
        plan: 'EXPIRED',
        effectiveStatus: 'EXPIRED',
        startedAt: null,
        expiresAt: null,
        remainingDays: 0,
        reason: 'forced-expired',
        policyActive: true,
      },
    }), capabilities);
    expect(labels(menu)).toEqual(['내정보관리', '구독 및 결제', '문의요청']);
    expect(isExpiredNativePathAllowed('/billing')).toBe(true);
    expect(isExpiredNativePathAllowed('/customers')).toBe(false);
  });

  test.each([
    { plan: 'PAID' as const, expiresAt: null, remainingDays: null },
    { plan: 'TRIAL' as const, expiresAt: '2099-12-31T23:59:59.000Z', remainingDays: 30 },
  ])(
    'keeps the complete CRM menu for $plan subscriptions',
    ({ plan, expiresAt, remainingDays }) => {
      const menu = buildNativeMenuForSession(user({
        subscription: {
          plan,
          effectiveStatus: 'ACTIVE',
          startedAt: null,
          expiresAt,
          remainingDays,
          reason: 'test',
          policyActive: true,
        },
      }), capabilities);
      expect(menu).toHaveLength(7);
      expect(labels(menu)).toHaveLength(24);
    },
  );

  test('hides billing during free launch except for a review account', () => {
    process.env.EXPO_PUBLIC_FREE_LAUNCH_HIDE_BILLING_UI = 'true';
    expect(labels(buildNativeMenuForSession(user(), capabilities))).not.toContain('구독 및 결제');
    expect(labels(buildNativeMenuForSession(user({
      username: 'google_review',
      gaCode: '',
    }), capabilities))).toContain('구독 및 결제');
  });

  test('routes public-account GA-only links to one restriction screen', () => {
    const menu = buildNativeMenuForSession(user({
      gaCode: 'GENERAL',
      gaName: '공용',
    }), capabilities);
    const links = menu.flatMap((section) => section.children);
    const team = links.find((link) => link.id === 'team-members');
    const customers = links.find((link) => link.id === 'customer-list');
    expect(team?.nativePath).toEqual(
      expect.stringContaining('/public-account-restricted?from='),
    );
    expect(team?.badge).toBe('GA 소속 계정 전용');
    expect(customers?.nativePath).toBe('/customers');
    expect(isPublicAccountGaOnlyPath('/team/files')).toBe(true);
    expect(isPublicAccountGaOnlyPath('/customers')).toBe(false);
  });
});
