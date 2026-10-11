import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DesignSystemProvider } from '../../../design-system';
import { AccountDeletionSection } from '../AccountDeletionSection';
import { requestAccountDeletion } from '../profileApi';

jest.mock('../profileApi', () => ({ requestAccountDeletion: jest.fn() }));
const request = jest.mocked(requestAccountDeletion);
const deleted = jest.fn(async () => {});
beforeEach(() => jest.resetAllMocks());
function screen() {
  return render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
    <DesignSystemProvider><AccountDeletionSection token="token" onDeleted={deleted} /></DesignSystemProvider>
  </SafeAreaProvider>);
}

test('requires the confirmation phrase and supports cancellation without deleting', () => {
  const ui = screen();
  fireEvent.press(ui.getByRole('button', { name: '회원탈퇴' }));
  expect(ui.getByRole('button', { name: '계정 삭제 요청' })).toBeDisabled();
  fireEvent.changeText(ui.getByLabelText('확인 문구'), '잘못된 문구');
  fireEvent.press(ui.getByRole('button', { name: '계정 삭제 요청' }));
  expect(request).not.toHaveBeenCalled();
  fireEvent.press(ui.getByRole('button', { name: '취소' }));
  fireEvent.press(ui.getByRole('button', { name: '닫기' }));
  expect(ui.queryByLabelText('확인 문구')).toBeNull();
  expect(request).not.toHaveBeenCalled();
});

test('submits once, locks pending actions and completes only after API success', async () => {
  let resolve!: (result: { ok: boolean; message: string }) => void;
  request.mockReturnValue(new Promise((done) => { resolve = done; }));
  const ui = screen();
  fireEvent.press(ui.getByRole('button', { name: '회원탈퇴' }));
  fireEvent.changeText(ui.getByLabelText('확인 문구'), '계정삭제');
  fireEvent.press(ui.getByRole('button', { name: '계정 삭제 요청' }));
  fireEvent.press(ui.getByRole('button', { name: '계정 삭제 요청' }));
  expect(request).toHaveBeenCalledTimes(1);
  expect(deleted).not.toHaveBeenCalled();
  expect(ui.getByRole('button', { name: '취소' })).toBeDisabled();
  await act(async () => resolve({ ok: true, message: '접수 완료' }));
  await waitFor(() => expect(deleted).toHaveBeenCalledWith('접수 완료'));
  expect(ui.queryByLabelText('확인 문구')).toBeNull();
});

test('keeps the form and session on a failed deletion', async () => {
  request.mockRejectedValue(new Error('서버 응답 오류'));
  const ui = screen();
  fireEvent.press(ui.getByRole('button', { name: '회원탈퇴' }));
  fireEvent.changeText(ui.getByLabelText('확인 문구'), '삭제');
  fireEvent.press(ui.getByRole('button', { name: '계정 삭제 요청' }));
  await waitFor(() => expect(ui.getByText('서버 응답 오류')).toBeTruthy());
  expect(deleted).not.toHaveBeenCalled();
  expect(ui.getByRole('button', { name: '계정 삭제 요청' })).not.toBeDisabled();
});
