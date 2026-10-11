import { applyPromotion, getQuote } from '../billingApi';
import { redeemNativeCoupon } from '../redeemNativeCoupon';

jest.mock('../billingApi', () => ({ getQuote: jest.fn(), applyPromotion: jest.fn() }));
const quote = jest.mocked(getQuote);
const apply = jest.mocked(applyPromotion);

beforeEach(() => {
  jest.resetAllMocks();
  quote.mockResolvedValue({ ok: true, quote: {
    valid: true, benefitKind: 'free_months', coupon: { code: 'FREE' },
  } } as Awaited<ReturnType<typeof getQuote>>);
  apply.mockResolvedValue({ ok: true, message: '적용 완료' });
});

test('normalizes the coupon and redeems it without any payment API', async () => {
  await expect(redeemNativeCoupon('token', ' free ', 'insurance_basic', 'monthly')).resolves.toEqual({ ok: true, message: '적용 완료' });
  expect(quote).toHaveBeenCalledWith('token', 'insurance_basic', 'monthly', 'FREE');
  expect(apply).toHaveBeenCalledWith('token', 'FREE', 'insurance_basic', 'monthly');
});

test('does not call the API for an empty coupon', async () => {
  await expect(redeemNativeCoupon('token', ' ', 'insurance_basic', 'monthly')).rejects.toThrow('쿠폰 코드를 입력');
  expect(quote).not.toHaveBeenCalled();
});

test.each(['invalid', 'discount'])('does not redeem a %s coupon', async (kind) => {
  quote.mockResolvedValue({ ok: true, quote: { valid: kind !== 'invalid', benefitKind: 'discount', coupon: { code: 'SALE' } } } as Awaited<ReturnType<typeof getQuote>>);
  await expect(redeemNativeCoupon('token', 'SALE', 'insurance_basic', 'monthly')).rejects.toThrow();
  expect(apply).not.toHaveBeenCalled();
});

test('shows a failed redemption instead of treating it as success', async () => {
  apply.mockResolvedValue({ ok: false, message: '이미 사용한 쿠폰입니다.' });
  await expect(redeemNativeCoupon('token', 'FREE', 'insurance_basic', 'monthly')).rejects.toThrow('이미 사용한 쿠폰');
});
