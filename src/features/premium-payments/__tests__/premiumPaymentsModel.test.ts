import { cardDisplay, formatPremium, monthStatusMeta, validateCardInput } from '../premiumPaymentsModel';

describe('premiumPaymentsModel', () => {
  it('never needs a raw number to render a card', () => { expect(cardDisplay({ id: 1, label: '본인', cardOwnerName: '홍길동', cardNumber: null, cardNumberDisplay: null, cardNumberLast4: '1234', cardExpiry: '01/30', cardExpiryMonth: 1, cardExpiryYear: 2030 })).toBe('본인 · •••• 1234'); });
  it('formats money and statuses', () => { expect(formatPremium(125000)).toBe('125,000원'); expect(monthStatusMeta('COMPLETED')).toEqual({ label: '이번 달 완료', tone: 'success' }); });
  it('validates sensitive card input without retaining it', () => { expect(validateCardInput({ cardOwnerName: '', cardNumber: '', month: '', year: '' }, false)).toContain('소유주'); expect(validateCardInput({ cardOwnerName: '홍길동', cardNumber: '1234 5678 9012 3456', month: '12', year: '2030' }, false)).toBeNull(); });
});
