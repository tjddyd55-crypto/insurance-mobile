import { ApiError } from '../../api/client';

export type CustomerRegistrationAlimtalkResult = {
  status: 'dry_run' | 'accepted' | 'sent' | 'blocked' | 'failed';
  templateKey?: string;
  tplCode?: string;
  receiverMasked?: string;
  provider?: string;
  providerMessageId?: string | null;
  providerCode?: number | null;
  providerMessage?: string | null;
};

const REGISTRATION_ALIMTALK_STATUSES = new Set<CustomerRegistrationAlimtalkResult['status']>([
  'dry_run',
  'accepted',
  'sent',
  'blocked',
  'failed',
]);

export function digitsOnlyPhone(raw: string): string {
  return String(raw ?? '').replace(/\D/g, '');
}

export function isValidMobilePhone(raw: string): boolean {
  return /^01[0-9]\d{7,8}$/.test(digitsOnlyPhone(raw));
}

export function resolveCustomerRegistrationPhoneError(
  receiver: string,
  hasInput: boolean,
): string | null {
  if (isValidMobilePhone(receiver)) {
    return null;
  }
  if (hasInput) {
    return '올바른 휴대폰번호를 입력해 주세요.';
  }
  return '휴대폰번호를 입력해 주세요.';
}

const COPY_SUCCESS_MESSAGE = '고객등록 링크를 복사했습니다.';

export function resolveCustomerRegistrationCopySuccessMessage(): string {
  return COPY_SUCCESS_MESSAGE;
}

export function normalizeCustomerRegistrationAlimtalkResult(
  value: unknown,
): CustomerRegistrationAlimtalkResult {
  if (!value || typeof value !== 'object') {
    return { status: 'failed' };
  }
  const row = value as CustomerRegistrationAlimtalkResult;
  const status = String(row.status ?? '').trim() as CustomerRegistrationAlimtalkResult['status'];
  if (REGISTRATION_ALIMTALK_STATUSES.has(status)) {
    return { ...row, status };
  }
  return { ...row, status: 'failed' };
}

/** Web CustomerLinkShareModal(registration) SSOT */
export function resolveCustomerRegistrationAlimtalkFeedback(
  result: CustomerRegistrationAlimtalkResult,
): { tone: 'success' | 'info' | 'error'; message: string; closeModal: boolean } {
  if (result.status === 'dry_run') {
    return {
      tone: 'success',
      message: '고객등록 카카오톡 발송 테스트가 완료되었습니다.',
      closeModal: false,
    };
  }
  if (result.status === 'accepted' || result.status === 'sent') {
    return {
      tone: 'success',
      message: '고객등록 카카오톡 발송 요청이 접수되었습니다.',
      closeModal: true,
    };
  }
  if (result.status === 'blocked') {
    return {
      tone: 'info',
      message:
        '템플릿 승인 전이라 실제 카카오톡 발송은 차단되었습니다. 링크 복사로 직접 전달할 수 있습니다.',
      closeModal: false,
    };
  }
  return {
    tone: 'error',
    message: '카카오톡 발송에 실패했습니다. 링크 복사로 직접 전달할 수 있습니다.',
    closeModal: false,
  };
}

export function resolveCustomerRegistrationAlimtalkError(error: unknown): string {
  if (error instanceof ApiError && error.data && typeof error.data === 'object') {
    const normalized = normalizeCustomerRegistrationAlimtalkResult(error.data);
    if (normalized.status === 'blocked' || normalized.status === 'failed') {
      return resolveCustomerRegistrationAlimtalkFeedback(normalized).message;
    }
  }
  if (error instanceof ApiError && error.message.trim()) {
    return `카카오톡 발송에 실패했습니다. ${error.message.trim()}`;
  }
  return '카카오톡 발송에 실패했습니다. 링크 복사로 직접 전달할 수 있습니다.';
}
