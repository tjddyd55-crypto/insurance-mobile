export type BillingNavigationDecision =
  | { action: 'allow' }
  | { action: 'deny' }
  | { action: 'success'; authKey: string; customerKey: string }
  | { action: 'failure'; message: string };

const CALLBACK_HOST = 'onefc.native';

/** Keeps the billing WebView on HTTPS and accepts only our exact callback contract. */
export function evaluateBillingNavigation(
  rawUrl: string,
  expectedCustomerKey: string,
): BillingNavigationDecision {
  try {
    const url = new URL(rawUrl);
    if (url.hostname !== CALLBACK_HOST) {
      return url.protocol === 'https:' ? { action: 'allow' } : { action: 'deny' };
    }
    if (url.pathname === '/' || url.pathname === '') {
      return { action: 'allow' };
    }
    if (url.pathname === '/billing/mobile-success') {
      const authKey = url.searchParams.get('authKey') ?? '';
      const customerKey = url.searchParams.get('customerKey') ?? '';
      if (!authKey || !customerKey || customerKey !== expectedCustomerKey) {
        return { action: 'failure', message: '카드 인증 결과가 올바르지 않습니다.' };
      }
      return { action: 'success', authKey, customerKey };
    }
    if (url.pathname === '/billing/mobile-fail') {
      return {
        action: 'failure',
        message:
          url.searchParams.get('message') ||
          url.searchParams.get('errorMessage') ||
          '카드 인증이 취소되었거나 실패했습니다.',
      };
    }
    return { action: 'deny' };
  } catch {
    return { action: 'deny' };
  }
}
