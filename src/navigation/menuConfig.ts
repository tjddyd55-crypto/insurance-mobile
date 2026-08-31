/**
 * Native menu SSOT — labels/order mirrored from insurance `buildAppMenuForSession` USER menu.
 * Do not rename menu labels arbitrarily.
 */

export type MenuImplementationMode = 'NATIVE' | 'WEBVIEW_TEMP' | 'PC_ONLY' | 'DISABLED';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'GA_ADMIN'
  | 'GA_STAFF'
  | 'USER'
  | 'INSURER_MANAGER'
  | 'LOSS_ADJUSTER';

export type NativeMenuLink = {
  type: 'link';
  id: string;
  label: string;
  legacyWebPath: string;
  nativePath: string;
  mode: MenuImplementationMode;
  roles: UserRole[];
  disabled?: boolean;
  badge?: string;
};

export type NativeMenuSection = {
  type: 'section';
  id: string;
  label: string;
  roles: UserRole[];
  children: NativeMenuLink[];
};

export type NativeMenuEntry = NativeMenuSection;

/** USER feature flags mirrored from gaTenantMenu.USER_MENU_FEATURE_FLAGS */
export const USER_MENU_FEATURE_FLAGS = {
  topLevelElectronicSignature: false,
  topLevelInsuranceClaim: false,
  customerManagementNewsletter: true,
  customerManagementClaim: true,
} as const;

const USER_ROLES: UserRole[] = ['USER'];

function link(
  partial: Omit<NativeMenuLink, 'type' | 'roles'> & { roles?: UserRole[] },
): NativeMenuLink {
  return {
    type: 'link',
    roles: partial.roles ?? USER_ROLES,
    ...partial,
  };
}

/**
 * Primary USER menu (Phase 0 / gaTenantMenu).
 * Mode notes for M1:
 * - Core shell routes: NATIVE placeholders
 * - Heavy legacy screens: WEBVIEW_TEMP (bridge later)
 * - Disabled/dev badge items stay visible per source policy
 */
export const USER_APP_MENU: NativeMenuSection[] = [
  {
    type: 'section',
    id: 'tasks-alerts',
    label: '할일 및 알림',
    roles: USER_ROLES,
    children: [
      link({
        id: 'ta-call',
        label: '오늘의 TA',
        legacyWebPath: '/ta-call',
        nativePath: '/ta-call',
        mode: 'NATIVE',
      }),
      link({
        id: 'todos',
        label: '할일',
        legacyWebPath: '/todos',
        nativePath: '/todos',
        mode: 'NATIVE',
      }),
      link({
        id: 'memo',
        label: '메모',
        legacyWebPath: '/memo',
        nativePath: '/memo',
        mode: 'NATIVE',
      }),
      link({
        id: 'notifications',
        label: '알림',
        legacyWebPath: '/notifications',
        nativePath: '/notifications',
        mode: 'NATIVE',
      }),
    ],
  },
  {
    type: 'section',
    id: 'customers',
    label: '고객관리',
    roles: USER_ROLES,
    children: [
      link({
        id: 'customer-list',
        label: '고객리스트',
        legacyWebPath: '/customers',
        nativePath: '/customers',
        mode: 'NATIVE',
      }),
      link({
        id: 'customer-map',
        label: '고객 지도',
        legacyWebPath: '/customers/map',
        nativePath: '/customers/map',
        mode: 'WEBVIEW_TEMP',
      }),
      link({
        id: 'premium-payments',
        label: '카드 수납',
        legacyWebPath: '/premium-payments',
        nativePath: '/premium-payments',
        mode: 'WEBVIEW_TEMP',
      }),
      ...(USER_MENU_FEATURE_FLAGS.customerManagementNewsletter
        ? [
            link({
              id: 'customer-newsletter',
              label: '고객소식지',
              legacyWebPath: '/claim-requests?claimTab=news-all',
              nativePath: '/claim-requests/news',
              mode: 'WEBVIEW_TEMP',
            }),
          ]
        : []),
      ...(USER_MENU_FEATURE_FLAGS.customerManagementClaim
        ? [
            link({
              id: 'claim-requests',
              label: '청구관리',
              legacyWebPath: '/claim-requests',
              nativePath: '/claim-requests',
              mode: 'WEBVIEW_TEMP',
            }),
          ]
        : []),
    ],
  },
  {
    type: 'section',
    id: 'newsletters',
    label: '소식지',
    roles: USER_ROLES,
    children: [
      link({
        id: 'insurer-newsletters',
        label: '원수사소식지',
        legacyWebPath: '/portal/newsletters',
        nativePath: '/portal/newsletters',
        mode: 'WEBVIEW_TEMP',
      }),
      link({
        id: 'adjuster-news',
        label: '손해사정사 소식지',
        legacyWebPath: '/portal/adjuster-news',
        nativePath: '/portal/adjuster-news',
        mode: 'WEBVIEW_TEMP',
      }),
    ],
  },
  {
    type: 'section',
    id: 'applications',
    label: '신청서',
    roles: USER_ROLES,
    children: [
      link({
        id: 'application-documents',
        label: '신청서 작성',
        legacyWebPath: '/application/documents',
        nativePath: '/application/documents',
        mode: 'WEBVIEW_TEMP',
      }),
      link({
        id: 'application-history',
        label: '신청서 작성내역',
        legacyWebPath: '/application/documents/history',
        nativePath: '/application/documents/history',
        mode: 'WEBVIEW_TEMP',
      }),
      link({
        id: 'rent-placeholder',
        label: '렌트(사고대차)',
        legacyWebPath: '#',
        nativePath: '/placeholder/rent',
        mode: 'DISABLED',
        disabled: true,
        badge: '개발중',
      }),
    ],
  },
  {
    type: 'section',
    id: 'team',
    label: '팀관리',
    roles: USER_ROLES,
    children: [
      link({
        id: 'team-members',
        label: '팀원리스트',
        legacyWebPath: '/team/members',
        nativePath: '/team/members',
        mode: 'NATIVE',
      }),
      link({
        id: 'team-posts',
        label: '팀 게시판',
        legacyWebPath: '/team/posts',
        nativePath: '/team/posts',
        mode: 'NATIVE',
      }),
      link({
        id: 'team-files',
        label: '팀 자료',
        legacyWebPath: '/team/files',
        nativePath: '/team/files',
        mode: 'NATIVE',
      }),
    ],
  },
  {
    type: 'section',
    id: 'convenience',
    label: '업무편의',
    roles: USER_ROLES,
    children: [
      link({
        id: 'sms-settings',
        label: '문자 발송',
        legacyWebPath: '/sms/settings',
        nativePath: '/sms/settings',
        mode: 'WEBVIEW_TEMP',
      }),
      link({
        id: 'insurance-contacts',
        label: '원수사 연락처',
        legacyWebPath: '/insurance/contacts',
        nativePath: '/insurance/contacts',
        mode: 'WEBVIEW_TEMP',
      }),
      link({
        id: 'account-credentials',
        label: '계정관리',
        legacyWebPath: '/insurance/account-credentials',
        nativePath: '/insurance/account-credentials',
        mode: 'WEBVIEW_TEMP',
      }),
      link({
        id: 'insurer-sites',
        label: '설계사이트',
        legacyWebPath: '/insurance/insurer-sites',
        nativePath: '/insurance/insurer-sites',
        mode: 'NATIVE',
      }),
    ],
  },
  {
    type: 'section',
    id: 'profile',
    label: '내정보',
    roles: USER_ROLES,
    children: [
      link({
        id: 'storage',
        label: '내 저장공간',
        legacyWebPath: '/storage',
        nativePath: '/storage',
        mode: 'WEBVIEW_TEMP',
      }),
      link({
        id: 'profile',
        label: '내정보관리',
        legacyWebPath: '/profile',
        nativePath: '/profile',
        mode: 'NATIVE',
      }),
      link({
        id: 'billing',
        label: '구독 및 결제',
        legacyWebPath: '/billing/checkout',
        nativePath: '/billing',
        mode: 'NATIVE',
      }),
      link({
        id: 'feature-request',
        label: '문의요청',
        legacyWebPath: '/feature-request',
        nativePath: '/feature-request',
        mode: 'WEBVIEW_TEMP',
      }),
    ],
  },
];

export function filterMenuForRole(
  menu: NativeMenuSection[],
  role: UserRole | undefined,
): NativeMenuSection[] {
  if (!role) {
    return [];
  }
  return menu
    .filter((section) => section.roles.includes(role))
    .map((section) => ({
      ...section,
      children: section.children.filter((child) => child.roles.includes(role)),
    }))
    .filter((section) => section.children.length > 0);
}

export function findMenuLinkByNativePath(
  nativePath: string,
  menu: NativeMenuSection[] = USER_APP_MENU,
): NativeMenuLink | undefined {
  const normalized = nativePath.replace(/\/+$/, '') || '/';
  for (const section of menu) {
    for (const child of section.children) {
      if (child.nativePath === normalized) {
        return child;
      }
    }
  }
  return undefined;
}

export function listPrimaryMenuLabels(menu: NativeMenuSection[] = USER_APP_MENU): string[] {
  return menu.map((section) => section.label);
}

export function listSecondaryMenuLabels(menu: NativeMenuSection[] = USER_APP_MENU): string[] {
  return menu.flatMap((section) => section.children.map((child) => child.label));
}
