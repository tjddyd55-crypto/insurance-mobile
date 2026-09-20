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

const KAKAO_SUCCESS_MESSAGE = '카카오톡으로 고객등록 링크를 발송했습니다.';
const COPY_SUCCESS_MESSAGE = '고객등록 링크를 복사했습니다.';

export function resolveCustomerRegistrationCopySuccessMessage(): string {
  return COPY_SUCCESS_MESSAGE;
}

export function resolveCustomerRegistrationAlimtalkFeedback(
  result: CustomerRegistrationAlimtalkResult,
): { tone: 'success' | 'info' | 'error'; message: string; closeModal: boolean } {
  if (result.status === 'dry_run' || result.status === 'accepted' || result.status === 'sent') {
    return { tone: 'success', message: KAKAO_SUCCESS_MESSAGE, closeModal: true };
  }
  if (result.status === 'blocked') {
    return {
      tone: 'info',
      message:
        '템플릿 승인 전이라 실제 카카오톡 발송은 차단되었습니다. 링크 복사로 직접 전달할 수 있습니다.',
      closeModal: false,
    };
  }
  const reason = result.providerMessage ? String(result.providerMessage).trim() : '';
  return {
    tone: 'error',
    message: reason
      ? '카카오톡 발송에 실패했습니다. 링크 복사로 직접 전달할 수 있습니다.'
      : '카카오톡 발송에 실패했습니다. 링크 복사로 직접 전달할 수 있습니다.',
    closeModal: false,
  };
}

export function resolveCustomerRegistrationAlimtalkError(error: unknown): string {
  const providerMessage =
    error instanceof ApiError &&
    error.data &&
    typeof error.data === 'object' &&
    'providerMessage' in error.data &&
    error.data.providerMessage
      ? String(error.data.providerMessage).trim()
      : '';
  if (providerMessage) {
    return '카카오톡 발송에 실패했습니다. 링크 복사로 직접 전달할 수 있습니다.';
  }
  if (error instanceof ApiError && error.message.trim()) {
    return `카카오톡 발송에 실패했습니다. ${error.message.trim()}`;
  }
  return '카카오톡 발송에 실패했습니다. 링크 복사로 직접 전달할 수 있습니다.';
}
