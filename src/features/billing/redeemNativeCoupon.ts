import { applyPromotion, getQuote } from './billingApi';
import type { BillingCycle } from './types';

/** A coupon redemption must never request a charge or register a payment method. */
export async function redeemNativeCoupon(
  token: string | null,
  code: string,
  plan: string,
  cycle: BillingCycle,
) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) throw new Error('쿠폰 코드를 입력해 주세요.');
  const result = await getQuote(token, plan, cycle, normalized);
  if (!result.ok || !result.quote.valid || !result.quote.coupon) {
    throw new Error(result.quote.message || '사용할 수 없는 쿠폰입니다.');
  }
  if (result.quote.benefitKind !== 'free_months') {
    throw new Error('앱에서는 무료 이용권 쿠폰을 적용할 수 있습니다.');
  }
  const applied = await applyPromotion(token, result.quote.coupon.code, plan, cycle);
  if (!applied.ok) throw new Error(applied.message || '쿠폰을 적용하지 못했습니다.');
  return applied;
}
