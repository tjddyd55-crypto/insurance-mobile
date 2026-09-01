import { evaluateBillingNavigation } from '../billingNavigation';

describe('evaluateBillingNavigation', () => {
  it('allows only https traffic outside the native callback host', () => {
    expect(evaluateBillingNavigation('https://pay.toss.im/auth', 'customer-1').action).toBe('allow');
    expect(evaluateBillingNavigation('http://pay.toss.im/auth', 'customer-1').action).toBe('deny');
    expect(evaluateBillingNavigation('intent://malicious', 'customer-1').action).toBe('deny');
  });

  it('accepts an exact success callback with the expected customer key', () => {
    expect(
      evaluateBillingNavigation(
        'https://onefc.native/billing/mobile-success?authKey=auth-1&customerKey=customer-1',
        'customer-1',
      ),
    ).toEqual({ action: 'success', authKey: 'auth-1', customerKey: 'customer-1' });
  });

  it('rejects a substituted customer key and unknown callback paths', () => {
    expect(
      evaluateBillingNavigation(
        'https://onefc.native/billing/mobile-success?authKey=auth-1&customerKey=attacker',
        'customer-1',
      ).action,
    ).toBe('failure');
    expect(evaluateBillingNavigation('https://onefc.native/billing/mobile-success/extra', 'customer-1').action).toBe('deny');
  });
});
