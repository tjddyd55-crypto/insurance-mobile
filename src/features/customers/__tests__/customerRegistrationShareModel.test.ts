import { ApiError } from '../../../api/client';
import {
  digitsOnlyPhone,
  isValidMobilePhone,
  resolveCustomerRegistrationAlimtalkError,
  resolveCustomerRegistrationAlimtalkFeedback,
  resolveCustomerRegistrationCopySuccessMessage,
  resolveCustomerRegistrationPhoneError,
} from '../customerRegistrationShareModel';

describe('customerRegistrationShareModel', () => {
  it('normalizes phone digits', () => {
    expect(digitsOnlyPhone('010-1234-5678')).toBe('01012345678');
  });

  it('validates mobile numbers', () => {
    expect(isValidMobilePhone('01012345678')).toBe(true);
    expect(isValidMobilePhone('010-1234-5678')).toBe(true);
    expect(isValidMobilePhone('0212345678')).toBe(false);
  });

  it('returns phone validation messages', () => {
    expect(resolveCustomerRegistrationPhoneError('', false)).toBe('휴대폰번호를 입력해 주세요.');
    expect(resolveCustomerRegistrationPhoneError('123', true)).toBe('올바른 휴대폰번호를 입력해 주세요.');
    expect(resolveCustomerRegistrationPhoneError('01012345678', true)).toBeNull();
  });

  it('maps alimtalk success statuses', () => {
    expect(resolveCustomerRegistrationAlimtalkFeedback({ status: 'sent' })).toEqual({
      tone: 'success',
      message: '카카오톡으로 고객등록 링크를 발송했습니다.',
      closeModal: true,
    });
    expect(resolveCustomerRegistrationAlimtalkFeedback({ status: 'dry_run' }).closeModal).toBe(true);
    expect(resolveCustomerRegistrationAlimtalkFeedback({ status: 'blocked' }).closeModal).toBe(false);
  });

  it('hides raw provider errors', () => {
    const message = resolveCustomerRegistrationAlimtalkError(
      new ApiError('provider exploded', 502, { data: { providerMessage: 'ALIGO-999' } }),
    );
    expect(message).not.toContain('ALIGO-999');
    expect(message).toContain('카카오톡 발송에 실패했습니다.');
  });

  it('uses copy success message SSOT', () => {
    expect(resolveCustomerRegistrationCopySuccessMessage()).toBe('고객등록 링크를 복사했습니다.');
  });
});
