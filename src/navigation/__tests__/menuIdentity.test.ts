import {
  buildNativeMenuForSession,
  type NativeMenuCapabilities,
} from '../nativeMenuPolicy';
import {
  findDuplicateNativeMenuChildIds,
  uniqueNativeMenuLinksById,
} from '../menuIdentity';
import type { AuthUser } from '../../api/authApi';

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

describe('menuIdentity', () => {
  test('uniqueNativeMenuLinksById keeps the first link for a duplicated id', () => {
    const links = uniqueNativeMenuLinksById([
      {
        type: 'link',
        id: 'newsletter-board-dup',
        label: '첫 번째',
        legacyWebPath: '/portal/boards/dup',
        nativePath: '/portal/boards/dup',
        mode: 'NATIVE',
        roles: ['USER'],
      },
      {
        type: 'link',
        id: 'newsletter-board-dup',
        label: '두 번째',
        legacyWebPath: '/portal/boards/dup',
        nativePath: '/portal/boards/dup',
        mode: 'NATIVE',
        roles: ['USER'],
      },
    ]);
    expect(links).toHaveLength(1);
    expect(links[0]?.label).toBe('첫 번째');
  });
});

describe('native menu child ids', () => {
  test('base USER menu has unique child ids in every section', () => {
    const menu = buildNativeMenuForSession(user(), capabilities);
    expect(findDuplicateNativeMenuChildIds(menu)).toEqual([]);
  });

  test('dedupes duplicate newsletter board slugs before injecting menu links', () => {
    const menu = buildNativeMenuForSession(user(), {
      ...capabilities,
      dynamicNewsletterBoards: [
        { label: '첫 GA 보드', slug: 'dup-board', boardScope: 'ga' },
        { label: '중복 GA 보드', slug: 'dup-board', boardScope: 'ga' },
        { label: '영진', slug: 'yeongjin', boardScope: 'ga' },
      ],
    });
    expect(findDuplicateNativeMenuChildIds(menu)).toEqual([]);
    const newsletterSection = menu.find((section) => section.id === 'newsletters');
    const dupLinks = newsletterSection?.children.filter(
      (child) => child.id === 'newsletter-board-dup-board',
    );
    expect(dupLinks).toHaveLength(1);
    expect(dupLinks?.[0]?.label).toBe('첫 GA 보드');
  });
});
