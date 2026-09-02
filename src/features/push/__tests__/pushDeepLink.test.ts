import { resolvePushDeepLink } from '../pushDeepLink';

describe('resolvePushDeepLink', () => {
  it('routes customer created to detail', () => {
    expect(
      resolvePushDeepLink({ type: 'CUSTOMER_CREATED', customerId: '42' }),
    ).toEqual({
      pathname: '/customers/[customerId]',
      params: { customerId: '42' },
    });
  });

  it('routes claim / file / inquiry to claim-requests', () => {
    expect(
      resolvePushDeepLink({
        type: 'CLAIM_CREATED',
        customerId: '7',
        claimId: '99',
      }),
    ).toEqual({
      pathname: '/customers/[customerId]/claim-requests',
      params: { customerId: '7', claimId: '99' },
    });
    expect(
      resolvePushDeepLink({ type: 'CUSTOMER_FILE_CREATED', customerId: '7', claimId: '1' })
        .pathname,
    ).toBe('/customers/[customerId]/claim-requests');
  });

  it('falls back to notification list on invalid payload', () => {
    expect(resolvePushDeepLink(null)).toEqual({ pathname: '/notifications' });
    expect(resolvePushDeepLink({ type: 'CLAIM_CREATED' })).toEqual({
      pathname: '/notifications',
    });
    expect(resolvePushDeepLink({ type: 'UNKNOWN', customerId: '1' })).toEqual({
      pathname: '/notifications',
    });
  });
});
