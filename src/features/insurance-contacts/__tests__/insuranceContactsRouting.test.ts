import { isGaMemberUser } from '../../entitlements/featureEntitlementPolicy';

const GENERAL_PERSONAL_CONTACTS_WEB_PATH = '/insurance/contacts';

function resolveInsuranceContactsPresentation(user: {
  gaCode?: string | null;
  gaName?: string | null;
}) {
  if (!isGaMemberUser(user)) {
    return { mode: 'legacy-web' as const, path: GENERAL_PERSONAL_CONTACTS_WEB_PATH };
  }
  return { mode: 'native-directory' as const };
}

describe('InsuranceContactsScreen routing policy', () => {
  it('routes GENERAL users to personal contacts web UI', () => {
    expect(resolveInsuranceContactsPresentation({ gaCode: 'GENERAL', gaName: '공용' })).toEqual({
      mode: 'legacy-web',
      path: '/insurance/contacts',
    });
  });

  it('keeps GA members on native company directory', () => {
    expect(
      resolveInsuranceContactsPresentation({ gaCode: 'YJASSET', gaName: '영진에셋' }),
    ).toEqual({
      mode: 'native-directory',
    });
  });
});
