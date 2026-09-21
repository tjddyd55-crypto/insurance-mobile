import { applyEntitlementMenuBadges } from '../applyEntitlementMenuBadges';
import { FEATURE_KEYS } from '../featureEntitlementPolicy';
import type { NativeMenuLink, NativeMenuSection } from '../../../navigation/menuConfig';

const FREE_GENERAL = { hasActivePaidAccess: false, isGaMember: false };
const ACTIVE_GENERAL = { hasActivePaidAccess: true, isGaMember: false };
const FREE_GA = { hasActivePaidAccess: false, isGaMember: true };
const ACTIVE_GA = { hasActivePaidAccess: true, isGaMember: true };

type EntitlementMenuLink = NativeMenuLink & {
  entitlementBlocked?: boolean;
  featureKey?: string;
};

function section(children: NativeMenuLink[]): NativeMenuSection[] {
  return [{ type: 'section', id: 'test', label: 'test', roles: ['USER'], children }];
}

describe('applyEntitlementMenuBadges', () => {
  it('adds paid badge for blocked features', () => {
    const [result] = applyEntitlementMenuBadges(
      section([
        {
          type: 'link',
          id: 'customer-list',
          label: '고객리스트',
          legacyWebPath: '/customers',
          nativePath: '/customers',
          mode: 'NATIVE',
          roles: ['USER'],
        },
      ]),
      FREE_GENERAL,
    );
    const link = result.children[0] as EntitlementMenuLink | undefined;
    expect(link?.badge).toBe('유료');
    expect(link?.entitlementBlocked).toBe(true);
    expect(link?.featureKey).toBe(FEATURE_KEYS.CUSTOMERS);
  });

  it('does not badge entitled ACTIVE_GENERAL paid features', () => {
    const [result] = applyEntitlementMenuBadges(
      section([
        {
          type: 'link',
          id: 'customer-list',
          label: '고객리스트',
          legacyWebPath: '/customers',
          nativePath: '/customers',
          mode: 'NATIVE',
          roles: ['USER'],
        },
        {
          type: 'link',
          id: 'customer-map',
          label: '고객 지도',
          legacyWebPath: '/customers/map',
          nativePath: '/customers/map',
          mode: 'NATIVE',
          roles: ['USER'],
        },
      ]),
      ACTIVE_GENERAL,
    );
    expect(result.children[0]?.badge).toBeUndefined();
    expect(result.children[1]?.badge).toBeUndefined();
  });

  it('does not badge GA-only features for FREE_GA users', () => {
    const [result] = applyEntitlementMenuBadges(
      section([
        {
          type: 'link',
          id: 'insurer-newsletters',
          label: '원수사소식지',
          legacyWebPath: '/portal/newsletters',
          nativePath: '/portal/newsletters',
          mode: 'NATIVE',
          roles: ['USER'],
        },
      ]),
      FREE_GA,
    );
    expect(result.children[0]?.badge).toBeUndefined();
  });

  it('does not badge ACTIVE_GA users on paid or GA features', () => {
    const [result] = applyEntitlementMenuBadges(
      section([
        {
          type: 'link',
          id: 'customer-list',
          label: '고객리스트',
          legacyWebPath: '/customers',
          nativePath: '/customers',
          mode: 'NATIVE',
          roles: ['USER'],
        },
        {
          type: 'link',
          id: 'insurer-newsletters',
          label: '원수사소식지',
          legacyWebPath: '/portal/newsletters',
          nativePath: '/portal/newsletters',
          mode: 'NATIVE',
          roles: ['USER'],
        },
      ]),
      ACTIVE_GA,
    );
    expect(result.children[0]?.badge).toBeUndefined();
    expect(result.children[1]?.badge).toBeUndefined();
  });
});
