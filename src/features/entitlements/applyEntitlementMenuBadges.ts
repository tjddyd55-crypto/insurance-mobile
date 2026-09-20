import type { NativeMenuLink, NativeMenuSection } from '../../navigation/menuConfig';
import {
  evaluateFeatureAccess,
  formatFeatureAccessBadge,
  type FeatureAccessContext,
  type FeatureKey,
} from './featureEntitlementPolicy';
import { resolveFeatureKeyFromPath } from './featureRoutePolicy';

export type MenuBoardScopeHint = {
  path: string;
  boardScope?: string | null;
};

export function applyEntitlementMenuBadges(
  sections: NativeMenuSection[],
  ctx: FeatureAccessContext,
  boardScopeHints: MenuBoardScopeHint[] = [],
): NativeMenuSection[] {
  const scopeByPath = new Map(
    boardScopeHints.map((hint) => [hint.path.split('?')[0] ?? hint.path, hint.boardScope ?? null]),
  );

  return sections.map((section) => ({
    ...section,
    children: section.children.map((child) => {
      if (child.disabled) return child;
      const normalizedPath = child.nativePath.split('?')[0] ?? child.nativePath;
      const featureKey = resolveFeatureKeyFromPath(normalizedPath, {
        newsletterBoardScope: scopeByPath.get(normalizedPath) ?? null,
      });
      if (!featureKey) return child;
      const verdict = evaluateFeatureAccess(featureKey as FeatureKey, ctx);
      const badge = formatFeatureAccessBadge(verdict.badges);
      if (!badge) return child;
      return {
        ...child,
        badge: child.badge ? `${child.badge} · ${badge}` : badge,
        entitlementBlocked: true,
        entitlementReason: verdict.reason,
        featureKey,
      } as NativeMenuLink & {
        entitlementBlocked?: boolean;
        entitlementReason?: 'paid_required' | 'ga_required' | null;
        featureKey?: string;
      };
    }),
  }));
}
