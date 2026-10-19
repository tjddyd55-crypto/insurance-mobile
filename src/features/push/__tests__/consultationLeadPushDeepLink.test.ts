import { resolvePushDeepLink } from '../pushDeepLink';

const LEAD_ID = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';

describe('consultation lead push deep link', () => {
  it('opens lead detail from the server route (insurance buildPushDataPayload)', () => {
    expect(
      resolvePushDeepLink({ type: 'ADVISOR_CONSULTATION_LEAD', route: `/consultation-leads/${LEAD_ID}`, leadId: LEAD_ID, referenceId: LEAD_ID }),
    ).toEqual({ pathname: '/consultation-leads/[leadId]', params: { leadId: LEAD_ID } });
  });

  it('falls back to leadId / referenceId when route is missing', () => {
    expect(resolvePushDeepLink({ type: 'ADVISOR_CONSULTATION_LEAD', leadId: LEAD_ID.toUpperCase() })).toEqual({
      pathname: '/consultation-leads/[leadId]',
      params: { leadId: LEAD_ID },
    });
    expect(resolvePushDeepLink({ type: 'advisor_consultation_lead', referenceId: LEAD_ID })).toEqual({
      pathname: '/consultation-leads/[leadId]',
      params: { leadId: LEAD_ID },
    });
  });

  it('accepts the web-style ?lead= route', () => {
    expect(resolvePushDeepLink({ route: `/consultation-leads?lead=${LEAD_ID}` })).toEqual({
      pathname: '/consultation-leads/[leadId]',
      params: { leadId: LEAD_ID },
    });
  });

  it('invalid lead ids open the list, never a broken detail', () => {
    expect(resolvePushDeepLink({ type: 'ADVISOR_CONSULTATION_LEAD', leadId: '../../etc' })).toEqual({ pathname: '/consultation-leads' });
    expect(resolvePushDeepLink({ route: '/consultation-leads/not-a-uuid' })).toEqual({ pathname: '/consultation-leads' });
  });

  it('keeps existing routing unchanged', () => {
    expect(resolvePushDeepLink({ type: 'CUSTOMER_CREATED', customerId: '42' }).pathname).toBe('/customers/[customerId]');
    expect(resolvePushDeepLink({ type: 'UNKNOWN' })).toEqual({ pathname: '/notifications' });
  });
});
