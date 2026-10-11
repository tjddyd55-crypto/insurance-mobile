import { apiRequest, ApiError } from '../../../api/client';
import { requestAccountDeletion } from '../profileApi';

jest.mock('../../../api/client', () => ({
  ...jest.requireActual('../../../api/client'), apiRequest: jest.fn(),
}));
const request = jest.mocked(apiRequest);
beforeEach(() => jest.resetAllMocks());

test('uses the existing authenticated Web self-service deletion contract', async () => {
  request.mockResolvedValue({ ok: true, message: '접수 완료' });
  await expect(requestAccountDeletion(' token ')).resolves.toEqual({ ok: true, message: '접수 완료' });
  expect(request).toHaveBeenCalledWith('/api/account/delete-request', {
    method: 'POST', token: 'token', body: '{}',
  });
});
test('rejects a missing session without requesting deletion', async () => {
  await expect(requestAccountDeletion(null)).rejects.toThrow('로그인이 필요');
  expect(request).not.toHaveBeenCalled();
});
test('does not treat an unsuccessful response as a completed deletion', async () => {
  request.mockResolvedValue({ ok: false, message: '접근이 제한된 계정입니다.' });
  await expect(requestAccountDeletion('token')).rejects.toThrow('접근이 제한');
});
test('preserves server failures for the user to retry', async () => {
  request.mockRejectedValue(new ApiError('서버에 연결할 수 없습니다.', 503));
  await expect(requestAccountDeletion('token')).rejects.toThrow('서버에 연결');
});
