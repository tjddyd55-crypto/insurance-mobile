import type { AuthUser } from '../api/authApi';
import { isBillingUiVisibleForUser } from '../features/billing/billingAccessPolicy';
import {
  USER_APP_MENU,
  type NativeMenuLink,
  type NativeMenuSection,
} from './menuConfig';

export type DynamicNewsletterBoardMenuItem = {
  label: string;
  slug: string;
  boardScope: 'global' | 'ga';
  systemKey?: string | null;
  isActive?: boolean;
};

export type NativeMenuCapabilities = {
  isTeamOwner: boolean;
  dynamicNewsletterBoards?: DynamicNewsletterBoardMenuItem[];
};

const EXPIRED_ALLOWED_NATIVE_PATHS = ['/profile', '/billing', '/feature-request'] as const;
const PUBLIC_ACCOUNT_GA_ONLY_PREFIXES = [
  '/application',
  '/team',
  '/portal/newsletters',
  '/portal/adjuster-news',
] as const;

export function isExpiredNativePathAllowed(pathname: string): boolean {
  return EXPIRED_ALLOWED_NATIVE_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function cloneUserMenu(): NativeMenuSection[] {
  return USER_APP_MENU.map((section) => ({
    ...section,
    children: section.children.map((child) => ({ ...child })),
  }));
}

export function isPublicGeneralAccount(user: AuthUser): boolean {
  const gaCode = user.gaCode.trim().toUpperCase().replace(/\s+/g, '');
  const gaName = user.gaName.trim();
  return gaCode === 'GENERAL'
    || gaName.toUpperCase() === 'GENERAL'
    || gaName.includes('공용');
}

export function isPublicAccountGaOnlyPath(path: string): boolean {
  return PUBLIC_ACCOUNT_GA_ONLY_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function applyNewsletterPolicy(
  sections: NativeMenuSection[],
  boards: DynamicNewsletterBoardMenuItem[] | undefined,
): NativeMenuSection[] {
  if (!boards || boards.length === 0) return sections;
  const lossAdjuster = boards.find(
    (board) => board.isActive !== false
      && String(board.systemKey ?? '').trim().toUpperCase() === 'LOSS_ADJUSTER',
  );
  return sections.map((section) => {
    if (section.id !== 'newsletters') return section;
    const children = section.children
      .filter((child) => child.id !== 'adjuster-news' || Boolean(lossAdjuster))
      .map((child) => child.id === 'adjuster-news' && lossAdjuster
        ? { ...child, label: lossAdjuster.label.trim() || child.label }
        : child);
    return { ...section, children };
  });
}

function injectTeamOwnerMenu(
  sections: NativeMenuSection[],
  isTeamOwner: boolean,
): NativeMenuSection[] {
  if (!isTeamOwner) return sections;
  const teamManage: NativeMenuLink = {
    type: 'link',
    id: 'team-manage',
    label: '팀 관리',
    legacyWebPath: '/team/manage',
    nativePath: '/team/manage',
    mode: 'NATIVE',
    roles: ['USER'],
  };
  return sections.map((section) => section.id === 'team'
    ? { ...section, children: [...section.children, teamManage] }
    : section);
}

function applyBillingVisibility(
  sections: NativeMenuSection[],
  user: AuthUser,
): NativeMenuSection[] {
  if (isBillingUiVisibleForUser(user)) return sections;
  return sections.map((section) => ({
    ...section,
    children: section.children.filter((child) => child.id !== 'billing'),
  }));
}

function applyExpiredPolicy(
  sections: NativeMenuSection[],
  expired: boolean,
): NativeMenuSection[] {
  if (!expired) return sections;
  return sections
    .map((section) => ({
      ...section,
      children: section.children.filter((child) =>
        isExpiredNativePathAllowed(child.nativePath)),
    }))
    .filter((section) => section.children.length > 0);
}

function applyPublicAccountPolicy(
  sections: NativeMenuSection[],
  publicAccount: boolean,
): NativeMenuSection[] {
  if (!publicAccount) return sections;
  return sections.map((section) => ({
    ...section,
    children: section.children.map((child) => {
      if (child.disabled || !isPublicAccountGaOnlyPath(child.nativePath)) return child;
      return {
        ...child,
        nativePath: `/public-account-restricted/index?from=${encodeURIComponent(child.nativePath)}`,
        badge: child.badge ?? 'GA 소속 계정 전용',
      };
    }),
  }));
}

export function buildNativeMenuForSession(
  user: AuthUser | null | undefined,
  capabilities: NativeMenuCapabilities,
): NativeMenuSection[] {
  if (!user || user.role !== 'USER') return [];

  const withNewsletter = applyNewsletterPolicy(
    cloneUserMenu(),
    capabilities.dynamicNewsletterBoards,
  );
  const withTeamOwner = injectTeamOwnerMenu(withNewsletter, capabilities.isTeamOwner);
  const withBillingPolicy = applyBillingVisibility(withTeamOwner, user);
  const withExpiredPolicy = applyExpiredPolicy(
    withBillingPolicy,
    user.subscription?.effectiveStatus === 'EXPIRED',
  );
  return applyPublicAccountPolicy(withExpiredPolicy, isPublicGeneralAccount(user));
}
