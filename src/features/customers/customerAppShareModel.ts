import { ApiError } from '../../api/client';

export type CustomerAppAlimtalkResult = {
  status: 'dry_run' | 'accepted' | 'sent' | 'blocked' | 'failed' | 'missing_receiver';
  templateKey?: string;
  tplCode?: string;
  receiverMasked?: string;
  customerAppUrl?: string;
  provider?: string;
  providerMessageId?: string | null;
  providerCode?: number | null;
  providerMessage?: string | null;
};

const CUSTOMER_APP_ALIMTALK_STATUSES = new Set<CustomerAppAlimtalkResult['status']>([
  'dry_run',
  'accepted',
  'sent',
  'blocked',
  'failed',
  'missing_receiver',
]);

const MISSING_CUSTOMER_PHONE_REASON = '고객 휴대폰번호가 없습니다.';

export function normalizeCustomerAppAlimtalkResult(value: unknown): CustomerAppAlimtalkResult {
  if (!value || typeof value !== 'object') {
    return { status: 'failed' };
  }
  const row = value as CustomerAppAlimtalkResult;
  const status = String(row.status ?? '').trim() as CustomerAppAlimtalkResult['status'];
  if (CUSTOMER_APP_ALIMTALK_STATUSES.has(status)) {
    return { ...row, status };
  }
  return { ...row, status: 'failed' };
}

/** Web CustomerLinkShareModal(customer-app) SSOT */
export function resolveCustomerAppAlimtalkFeedback(
  result: CustomerAppAlimtalkResult,
): { tone: 'success' | 'info' | 'error'; message: string } {
  if (result.status === 'dry_run') {
    return {
      tone: 'success',
      message: '고객앱 링크 카카오톡 발송 테스트가 완료되었습니다.',
    };
  }
  if (result.status === 'accepted' || result.status === 'sent') {
    return {
      tone: 'success',
      message: '고객앱 링크 카카오톡 발송 요청이 접수되었습니다.',
    };
  }
  if (result.status === 'blocked') {
    return {
      tone: 'info',
      message:
        '템플릿 승인 전이라 실제 카카오톡 발송은 차단되었습니다. 링크 복사로 직접 전달할 수 있습니다.',
    };
  }
  if (result.status === 'missing_receiver') {
    return {
      tone: 'error',
      message: MISSING_CUSTOMER_PHONE_REASON,
    };
  }
  return {
    tone: 'error',
    message: '카카오톡 발송에 실패했습니다. 링크 복사로 직접 전달할 수 있습니다.',
  };
}

export function resolveCustomerAppAlimtalkError(error: unknown): string {
  if (error instanceof ApiError && error.data && typeof error.data === 'object') {
    const normalized = normalizeCustomerAppAlimtalkResult(error.data);
    if (
      normalized.status === 'blocked' ||
      normalized.status === 'missing_receiver' ||
      normalized.status === 'failed'
    ) {
      return resolveCustomerAppAlimtalkFeedback(normalized).message;
    }
  }
  if (error instanceof ApiError && error.message.trim()) {
    return error.message.trim();
  }
  return '알림톡 발송에 실패했습니다.';
}
