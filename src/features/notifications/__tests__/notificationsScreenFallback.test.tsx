import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DesignSystemProvider } from '../../../design-system';
import { NotificationsScreen } from '../NotificationsScreen';
import { normalizeNotificationList } from '../notificationModel';

// SectionList 가상화 때문에 테스트에서 뒤쪽 섹션이 안 그려지므로 전부 렌더하도록 고정
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  const Orig = RN.SectionList;
  const Full = React.forwardRef((props: object, ref: unknown) => React.createElement(Orig, { ...props, ref, initialNumToRender: 500 }));
  Full.displayName = 'FullSectionList';
  Object.defineProperty(RN, 'SectionList', { configurable: true, get: () => Full });
  return RN;
});
const mockPush = jest.fn();
const mockApi = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }) }));
jest.mock('../../../auth/AuthProvider', () => ({ useAuth: () => ({ token: 'tok' }) }));
jest.mock('../../../components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('../../../api/client', () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) { super(message); this.status = status; }
  }
  return { ApiError, apiRequest: (...args: unknown[]) => mockApi(...args) };
});

const row = (over: Record<string, unknown>) => ({
  id: String(over.id), type: 'car_expiry', message: '', customer_id: 7, customer_name: 'A고객',
  target_date: '2026-10-30', created_at: '2026-10-20T00:00:00Z', is_read: true, is_dismissed: false, ...over,
});

const clients: QueryClient[] = [];
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={client}>
        <DesignSystemProvider><NotificationsScreen /></DesignSystemProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}
function listResponse(notifications: unknown[]) {
  mockApi.mockImplementation(async (url: string) => {
    if (url.startsWith('/api/notifications?')) return { notifications, settings: {} };
    return { ok: true };
  });
}

beforeEach(() => { mockPush.mockReset(); mockApi.mockReset(); });
afterEach(() => { clients.splice(0).forEach((c) => c.clear()); });

describe('알림 목록 – 모르는 type', () => {
  it('normalize: 모르는 type 은 other, 목록은 그대로', () => {
    const result = normalizeNotificationList({
      notifications: [row({ id: 1 }), row({ id: 2, type: 'TEAM_POST_NEW', message: '새 글' }), { id: '' }, null],
    });
    expect(result.notifications.map((n) => n.type)).toEqual(['car_expiry', 'other']);
    expect(result.notifications[1].rawType).toBe('TEAM_POST_NEW');
  });

  it('알려진 + 상담 신청 + 모르는 type 섞여도 에러 없이 보인다(대체 제목 알림, 문구 표시)', async () => {
    listResponse([
      row({ id: 1, is_read: false }),
      row({ id: 2, type: 'advisor_consultation_lead', customer_id: null, customer_name: null, message: '상담 신청이 들어왔습니다', reference_id: '55' }),
      row({ id: 3, type: 'comment', customer_id: null, customer_name: null, message: '댓글 문구' }),
    ]);
    const ui = mount();
    await waitFor(() => expect(ui.getByText('A고객')).toBeTruthy());
    expect(ui.queryByText('알림을 불러오지 못했습니다')).toBeNull();
    expect(ui.getAllByText('상담 신청').length).toBeGreaterThan(0);
    expect(ui.getByText('상담 신청이 들어왔습니다')).toBeTruthy();
    expect(ui.getAllByText('알림').length).toBeGreaterThan(0);
    expect(ui.getByText('댓글 문구')).toBeTruthy();
    expect(ui.getByText('새 알림')).toBeTruthy(); // 읽지 않음 1건
    expect(ui.getByText('1개')).toBeTruthy();
  });

  it('갈 곳 있는 알림 탭 → 이동, 모르는/대상 없는 알림 탭 → 아무 일 없음(크래시 없음)', async () => {
    listResponse([
      row({ id: 1 }),
      row({ id: 3, type: 'TEAM_POST_NEW', customer_id: null, customer_name: null, message: '팀 글' }),
    ]);
    const ui = mount();
    await waitFor(() => expect(ui.getByText('A고객')).toBeTruthy());
    act(() => { fireEvent.press(ui.getByText('팀 글')); });
    expect(mockPush).not.toHaveBeenCalled();
    act(() => { fireEvent.press(ui.getByText('A고객')); });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/customers/[customerId]/consultations', params: { customerId: '7' } });
  });

  it('빈 목록은 에러가 아니라 빈 안내', async () => {
    listResponse([]);
    const ui = mount();
    await waitFor(() => expect(ui.getAllByText('표시할 알림이 없습니다.').length).toBeGreaterThan(0));
    expect(ui.queryByText('알림을 불러오지 못했습니다')).toBeNull();
    expect(ui.queryByText('상담 신청')).toBeNull();
  });

  it('API 500 일 때만 오류·다시 시도', async () => {
    mockApi.mockRejectedValue(new Error('서버 오류'));
    const ui = mount();
    await waitFor(() => expect(ui.getByText('알림을 불러오지 못했습니다')).toBeTruthy());
    listResponse([row({ id: 1 })]);
    act(() => { fireEvent.press(ui.getByText('다시 시도')); });
    await waitFor(() => expect(ui.getByText('A고객')).toBeTruthy());
  });
});
