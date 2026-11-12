import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DesignSystemProvider } from '../../../design-system';
import { StorageScreen } from '../StorageScreen';
import * as api from '../storageApi';
import { ApiError } from '../../../api/client';

jest.mock('../../../auth/AuthProvider', () => ({ useAuth: () => ({ token: 'fixture' }) }));
jest.mock('../../../components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('../storageApi', () => ({
  ...jest.requireActual('../storageApi'),
  listStorageFiles: jest.fn(), listStorageFolders: jest.fn(), getStorageQuota: jest.fn(), getStorageUsageBreakdown: jest.fn(),
  fetchStorageFileBinderDeleteImpact: jest.fn(), deleteStorageFilesBatch: jest.fn(), deleteStorageFile: jest.fn(),
}));
const rows = [1, 2].map((id) => ({ id, displayName: `현재 이름${id}.pdf`, fileName: `original${id}.pdf`, folderId: null, fileUrl: '', fileSize: 100, mimeType: 'application/pdf', createdAt: '2026-11-12' }));
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const clients: QueryClient[] = [];
afterEach(() => { clients.splice(0).forEach((client) => client.clear()); });
function screen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><SafeAreaProvider initialMetrics={metrics}><DesignSystemProvider><StorageScreen /></DesignSystemProvider></SafeAreaProvider></QueryClientProvider>);
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.listStorageFiles).mockResolvedValue(rows);
  jest.mocked(api.listStorageFolders).mockResolvedValue([{ id: 10, name: '폴더', parentId: null, createdAt: '' }]);
  jest.mocked(api.getStorageQuota).mockResolvedValue({ usedBytes: 200, limitBytes: 1000, pendingUploadBytes: 0 });
  jest.mocked(api.getStorageUsageBreakdown).mockResolvedValue({ summary: [], totalCount: 2, totalSize: 200 });
  jest.mocked(api.fetchStorageFileBinderDeleteImpact).mockImplementation(async (_token, id) => ({ binderCount: id === 1 ? 2 : 0, materialCount: 1, binderItemCount: id === 1 ? 3 : 0, binders: [], materials: [] }));
  jest.mocked(api.deleteStorageFile).mockResolvedValue(undefined);
});
it('selects only files, cancels without deleting, and retains partial failures', async () => {
  const ui = screen();
  await ui.findByText('📄 현재 이름1.pdf');
  fireEvent.press(ui.getByRole('button', { name: '선택' }));
  expect(ui.getAllByRole('checkbox')).toHaveLength(2);
  fireEvent.press(ui.getByRole('button', { name: '전체 선택' }));
  expect(ui.getByText('2개 선택됨')).toBeTruthy();
  fireEvent.press(ui.getByRole('button', { name: '선택 삭제' }));
  expect(await ui.findByText('선택한 2개 파일을 삭제하시겠습니까?')).toBeTruthy();
  expect(ui.getByText('선택한 파일 중 1개가 바인더에서 사용 중입니다.')).toBeTruthy();
  fireEvent.press(ui.getByRole('button', { name: '취소' }));
  expect(api.deleteStorageFilesBatch).not.toHaveBeenCalled();
  jest.mocked(api.deleteStorageFilesBatch).mockImplementation(async () => {
    jest.mocked(api.listStorageFiles).mockResolvedValue([rows[1]]);
    return { deleted: [1], failed: [{ id: 2, reason: 'INTERNAL' }] };
  });
  fireEvent.press(ui.getByRole('button', { name: '선택 삭제' }));
  fireEvent.press(await ui.findByRole('button', { name: '파일과 바인더 참조 모두 삭제' }));
  expect(await ui.findByText('1개 삭제 완료 / 1개 삭제 실패')).toBeTruthy();
  await waitFor(() => expect(ui.queryByText('📄 현재 이름1.pdf')).toBeNull());
  expect(ui.getByText('1개 선택됨')).toBeTruthy();
  expect(ui.getByRole('checkbox', { name: '현재 이름2.pdf 선택' }).props.accessibilityState.checked).toBe(true);
  expect(api.deleteStorageFilesBatch).toHaveBeenCalledWith('fixture', [1, 2], true);
  expect(api.getStorageQuota).toHaveBeenCalledTimes(2);
});
it('requires explicit single-file binder cleanup and sends the alias', async () => {
  const ui = screen();
  await ui.findByText('📄 현재 이름1.pdf');
  fireEvent.press(ui.getByRole('button', { name: '선택' }));
  fireEvent.press(ui.getByRole('checkbox', { name: '현재 이름2.pdf 선택' }));
  // Folder delete comes first; file 1 comes next.
  fireEvent.press(ui.getAllByRole('button', { name: '삭제' })[1]);
  expect(await ui.findByText('이 파일은 2개의 바인더에서 사용 중입니다.')).toBeTruthy();
  expect(api.deleteStorageFile).not.toHaveBeenCalled();
  fireEvent.press(ui.getByRole('button', { name: '파일과 바인더 참조 모두 삭제' }));
  await waitFor(() => expect(api.deleteStorageFile).toHaveBeenCalledWith('fixture', 1, true));
  expect(api.deleteStorageFilesBatch).not.toHaveBeenCalled();
  await ui.findByText('1개 삭제 완료');
  expect(ui.getByText('1개 선택됨')).toBeTruthy();
});
it('blocks confirmation on impact errors but lets stale 404 rows reach batch deletion', async () => {
  const ui = screen();
  await ui.findByText('📄 현재 이름1.pdf');
  fireEvent.press(ui.getByRole('button', { name: '선택' }));
  fireEvent.press(ui.getByRole('button', { name: '전체 선택' }));
  jest.mocked(api.fetchStorageFileBinderDeleteImpact).mockRejectedValue(new Error('영향 조회 실패'));
  fireEvent.press(ui.getByRole('button', { name: '선택 삭제' }));
  expect(await ui.findByText('영향 조회 실패')).toBeTruthy();
  expect(ui.queryByText('선택한 2개 파일을 삭제하시겠습니까?')).toBeNull();
  expect(api.deleteStorageFilesBatch).not.toHaveBeenCalled();
  jest.mocked(api.fetchStorageFileBinderDeleteImpact).mockRejectedValue(new ApiError('없음', 404));
  fireEvent.press(ui.getByRole('button', { name: '선택 삭제' }));
  expect(await ui.findByText('선택한 2개 파일을 삭제하시겠습니까?')).toBeTruthy();
  expect(ui.queryByRole('button', { name: '파일과 바인더 참조 모두 삭제' })).toBeNull();
});
