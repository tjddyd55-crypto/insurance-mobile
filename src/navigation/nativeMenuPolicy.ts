import type { AuthUser } from '../api/authApi';
import {
  isInsuranceBillingAccessEnforced,
  isInsuranceBillingEnabled,
  isBillingUiVisibleForUser,
} from '../features/billing/billingAccessPolicy';
import { applyEntitlementMenuBadges } from '../features/entitlements/applyEntitlementMenuBadges';
import { isGaMemberUser } from '../features/entitlements/featureEntitlementPolicy';
import {
  dedupeNewsletterBoardMenuItems,
  partitionNewsletterBoardsForMenu,
  buildNewsletterBoardViewPath,
  type DynamicNewsletterBoardMenuItem,
} from '../features/newsletters/newsletterBoardMenu';
import {
  USER_APP_MENU,
  type NativeMenuLink,
  type NativeMenuSection,
} from './menuConfig';
import { normalizeNativeMenuSections, uniqueNativeMenuLinksById } from './menuIdentity';

export type { DynamicNewsletterBoardMenuItem } from '../features/newsletters/newsletterBoardMenu';

export type NativeMenuCapabilities = {
  isTeamOwner: boolean;
  dynamicNewsletterBoards?: DynamicNewsletterBoardMenuItem[];
  hasActivePaidAccess?: boolean;
};

const EXPIRED_ALLOWED_NATIVE_PATHS = ['/profile', '/billing', '/feature-request'] as const;
const PUBLIC_ACCOUNT_GA_ONLY_PREFIXES = [
  '/application',
  '/portal/newsletters',
  '/portal/adjuster-news',
] as const;
const NATIVE_CRM_MENU_ROLES = new Set<AuthUser['role']>(['USER', 'SUPER_ADMIN']);

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
  return !isGaMemberUser(user);
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
  if (boards == null) return sections;
  const { lossAdjuster, dynamicBoards } = partitionNewsletterBoardsForMenu(
    dedupeNewsletterBoardMenuItems(boards),
  );
  return sections.map((section) => {
    if (section.id !== 'newsletters') return section;
    const children = section.children
      .filter((child) => child.id !== 'adjuster-news' || Boolean(lossAdjuster))
      .map((child) =>
        child.id === 'adjuster-news' && lossAdjuster
          ? { ...child, label: lossAdjuster.label.trim() || child.label }
          : child,
      );
    const boardLinks: NativeMenuLink[] = dynamicBoards
      .filter((board) => board.isActive !== false && board.slug.trim())
      .map((board) => {
        const slug = board.slug.trim();
        const path = buildNewsletterBoardViewPath(slug);
        return {
          type: 'link',
          id: `newsletter-board-${slug}`,
          label: board.label.trim() || '소식지',
          legacyWebPath: path,
          nativePath: path,
          mode: 'NATIVE',
          roles: ['USER'],
        };
      });
    return {
      ...section,
      children: uniqueNativeMenuLinksById([...children, ...boardLinks]),
    };
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

function buildNewsletterBoardScopeHints(
  boards: DynamicNewsletterBoardMenuItem[] = [],
): { path: string; boardScope: string | null }[] {
  return boards
    .filter((board) => board.slug.trim())
    .map((board) => ({
      path: buildNewsletterBoardViewPath(board.slug.trim()),
      boardScope: board.boardScope ?? null,
    }));
}

function applyEntitlementPolicy(
  sections: NativeMenuSection[],
  user: AuthUser,
  capabilities: NativeMenuCapabilities,
): NativeMenuSection[] {
  const billingEnforced = isInsuranceBillingEnabled() && isInsuranceBillingAccessEnforced();
  return applyEntitlementMenuBadges(
    sections,
    {
      hasActivePaidAccess: billingEnforced
        ? capabilities.hasActivePaidAccess === true
        : true,
      isGaMember: isGaMemberUser(user),
    },
    buildNewsletterBoardScopeHints(capabilities.dynamicNewsletterBoards),
  );
}

function applyPcOnlyMenuPolicy(sections: NativeMenuSection[]): NativeMenuSection[] {
  return sections
    .map((section) => ({
      ...section,
      children: section.children.filter((child) => child.mode !== 'PC_ONLY'),
    }))
    .filter((section) => section.children.length > 0);
}

export function buildNativeMenuForSession(
  user: AuthUser | null | undefined,
  capabilities: NativeMenuCapabilities,
): NativeMenuSection[] {
  if (!user || !NATIVE_CRM_MENU_ROLES.has(user.role)) return [];

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
  const withEntitlement = applyEntitlementPolicy(withExpiredPolicy, user, capabilities);
  return normalizeNativeMenuSections(applyPcOnlyMenuPolicy(withEntitlement));
}
