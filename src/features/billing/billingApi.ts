import { ApiError, apiRequest } from '../../api/client';
import type { BillingCycle, CheckoutQuote, CheckoutSummary } from './types';
export const billingCheckoutSummaryQueryKey = ['billing', 'checkout'] as const;
function auth(token: string | null): string { if (!token?.trim()) throw new ApiError('로그인이 필요합니다.', 401); return token.trim(); }
export async function getCheckoutSummary(token: string | null) { return apiRequest<CheckoutSummary>('/api/billing/checkout/summary', { token: auth(token) }); }
export async function getQuote(token: string | null, planCode: string, billingCycle: BillingCycle, promotionCode?: string | null) { return apiRequest<{ ok: boolean; quote: CheckoutQuote }>('/api/billing/checkout/quote', { method: 'POST', token: auth(token), body: JSON.stringify({ planCode, billingCycle, promotionCode }) }); }
export async function applyPromotion(token: string | null, code: string, planCode: string, billingCycle: BillingCycle) { return apiRequest<{ ok: boolean; status?: string; subscriptionStatus?: string; message?: string }>('/api/billing/checkout/apply-promotion', { method: 'POST', token: auth(token), body: JSON.stringify({ code, planCode, billingCycle }) }); }
