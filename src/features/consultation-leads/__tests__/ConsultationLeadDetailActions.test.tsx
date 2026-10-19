/** t378u H2 — 상세 상태 버튼: 신규→확인+완료, 확인→완료만, 완료→없음. 성공 시 상세·목록·배지 캐시 즉시 반영. */
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DesignSystemProvider } from '../../../design-system';
import { ConsultationLeadDetailScreen } from '../ConsultationLeadDetailScreen';
import { applyLeadToList } from '../consultationLeadModel';
import { getConsultationLead, updateConsultationLeadStatus } from '../consultationLeadsApi';
import { consultationLeadQueryKeys } from '../queryKeys';
import type { ConsultationLead, ConsultationLeadList, ConsultationLeadStatus } from '../types';

jest.mock('expo-router', () => ({ useRouter: () => ({ canGoBack: () => true, back: jest.fn(), replace: jest.fn(), push: jest.fn() }) }));
jest.mock('../../../components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('../../../auth/AuthProvider', () => ({ useAuth: () => ({ token: 'tok', user: { id: 'u1', role: 'USER' } }) }));
jest.mock('../consultationLeadsApi', () => ({
  getConsultationLead: jest.fn(),
  updateConsultationLeadStatus: jest.fn(),
  listConsultationLeads: jest.fn(),
}));

const LEAD_ID = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
const lead = (status: ConsultationLeadStatus, patch: Partial<ConsultationLead> = {}): ConsultationLead => ({
  id: LEAD_ID,
  visitorName: '홍길동',
  phoneNormalized: '01012345678',
  phoneDisplay: '010 1234 5678',
  message: '상담 원합니다',
  contactChannel: 'phone',
  privacyConsent: true,
  privacyConsentAt: '2026-10-19T01:00:00.000Z',
  privacyPolicyVersion: 'v1',
  status,
  checkedAt: null,
  completedAt: status === 'completed' ? '2026-10-19T03:00:00.000Z' : null,
  createdAt: '2026-10-19T01:00:00.000Z',
  updatedAt: null,
  ...patch,
});

const get = jest.mocked(getConsultationLead);
const update = jest.mocked(updateConsultationLeadStatus);

function mount(status: ConsultationLeadStatus, list?: ConsultationLeadList) {
  get.mockResolvedValue(lead(status));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  if (list) client.setQueryData(consultationLeadQueryKeys.list(), list);
  const ui = render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={client}>
        <DesignSystemProvider><ConsultationLeadDetailScreen leadId={LEAD_ID} /></DesignSystemProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  return { ui, client };
}

beforeEach(() => jest.clearAllMocks());

test('new: 확인 처리 + 완료 처리, call/SMS unchanged', async () => {
  const { ui } = mount('new');
  await waitFor(() => expect(ui.getByText('확인 처리')).toBeTruthy());
  expect(ui.getByText('완료 처리')).toBeTruthy();
  expect(ui.getByText('전화하기')).toBeTruthy();
  expect(ui.getByText('문자하기')).toBeTruthy();
});

test('checked: no 확인 처리 button, only 완료 처리', async () => {
  const { ui } = mount('checked');
  await waitFor(() => expect(ui.getByText('완료 처리')).toBeTruthy());
  expect(ui.queryByText('확인 처리')).toBeNull();
});

test('completed: no status buttons, completed state only', async () => {
  const { ui } = mount('completed');
  await waitFor(() => expect(ui.getByText(/완료된 상담 신청입니다/)).toBeTruthy());
  expect(ui.queryByText('확인 처리')).toBeNull();
  expect(ui.queryByText('완료 처리')).toBeNull();
  expect(ui.getByText('전화하기')).toBeTruthy();
});

test('success updates detail, list and badge cache immediately (no backward button appears)', async () => {
  const list: ConsultationLeadList = { items: [lead('new'), lead('checked', { id: 'other' })], newCount: 1 };
  const { ui, client } = mount('new', list);
  update.mockResolvedValue(lead('checked'));
  await waitFor(() => expect(ui.getByText('확인 처리')).toBeTruthy());
  await act(async () => {
    fireEvent.press(ui.getByText('확인 처리'));
  });
  await waitFor(() => expect(ui.queryByText('확인 처리')).toBeNull());
  expect(update).toHaveBeenCalledWith('tok', LEAD_ID, 'checked');
  expect(ui.getByText('완료 처리')).toBeTruthy();
  const cached = client.getQueryData<ConsultationLeadList>(consultationLeadQueryKeys.list());
  expect(cached?.items[0]?.status).toBe('checked');
  expect(cached?.newCount).toBe(0);
});

test('applyLeadToList keeps unknown leads and clamps badge count', () => {
  const list: ConsultationLeadList = { items: [lead('new')], newCount: 3 };
  expect(applyLeadToList(list, lead('completed', { id: 'missing' }))).toBe(list);
  expect(applyLeadToList(list, lead('completed'))?.newCount).toBe(2);
  expect(applyLeadToList({ items: [lead('new')], newCount: 0 }, lead('checked'))?.newCount).toBe(0);
  expect(applyLeadToList(undefined, lead('checked'))).toBeUndefined();
});
