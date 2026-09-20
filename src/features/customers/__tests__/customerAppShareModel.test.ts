import { ApiError } from '../../../api/client';
import {
  normalizeCustomerAppAlimtalkResult,
  resolveCustomerAppAlimtalkError,
  resolveCustomerAppAlimtalkFeedback,
} from '../customerAppShareModel';

describe('customerAppShareModel', () => {
  it('normalizes unknown status to failed', () => {
    expect(normalizeCustomerAppAlimtalkResult({ status: 'weird' }).status).toBe('failed');
    expect(normalizeCustomerAppAlimtalkResult(null).status).toBe('failed');
  });

  it('maps dry_run to Web SSOT test message', () => {
    expect(resolveCustomerAppAlimtalkFeedback({ status: 'dry_run' })).toEqual({
      tone: 'success',
      message: '고객앱 링크 카카오톡 발송 테스트가 완료되었습니다.',
    });
  });

  it('maps accepted/sent statuses (Web SSOT)', () => {
    expect(resolveCustomerAppAlimtalkFeedback({ status: 'accepted' })).toEqual({
      tone: 'success',
      message: '고객앱 링크 카카오톡 발송 요청이 접수되었습니다.',
    });
    expect(resolveCustomerAppAlimtalkFeedback({
      status: 'sent',
      receiverMasked: '010-****-5678',
    }).message).toBe('고객앱 링크 카카오톡 발송 요청이 접수되었습니다.');
  });

  it('maps blocked and missing_receiver', () => {
    expect(resolveCustomerAppAlimtalkFeedback({ status: 'blocked' }).tone).toBe('info');
    expect(resolveCustomerAppAlimtalkFeedback({ status: 'missing_receiver' }).tone).toBe('error');
  });

  it('hides raw provider errors', () => {
    const message = resolveCustomerAppAlimtalkError(
      new ApiError('provider exploded', 502, { data: { status: 'failed', providerMessage: 'ALIGO-999' } }),
    );
    expect(message).not.toContain('ALIGO-999');
    expect(message).toContain('카카오톡 발송에 실패했습니다.');
  });
});
