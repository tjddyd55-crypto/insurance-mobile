import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AuthUser } from '../../../api/authApi';
import { useAuth } from '../../../auth/AuthProvider';
import { DesignSystemProvider } from '../../../design-system';
import { EducationScheduleScreen } from '../EducationScheduleScreen';
import { loadEducationMonth, saveEducationSchedule, type EducationMonth } from '../educationScheduleApi';

jest.mock('../../../auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../../../components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('../EducationScheduleAiModal', () => ({ EducationScheduleAiModal: () => null }));
jest.mock('../educationScheduleApi');
jest.mock('../../schedule/scheduleModel', () => ({
  ...jest.requireActual('../../schedule/scheduleModel'),
  seoulYmd: () => '2026-12-01',
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const row = {
  id: 'one', date: '2026-12-25', title: '선택 날짜 상세에서 전체 표시하는 교육 과정', instructor: '김 강사',
  publicScope: 'GROUP_COMMON', scopeId: 1, canEdit: false, canDelete: false,
} as const;

function renderSchedule(role: AuthUser['role'], canCreate: boolean) {
  const user = { id: 'user-1', gaId: 10, gaCode: 'TEST', gaName: '테스트 GA', role };
  jest.mocked(useAuth).mockReturnValue({ token: 'test-token', user } as ReturnType<typeof useAuth>);
  const month: EducationMonth = {
    month: '2026-12', canCreate, canSelectScope: false, selectedScope: null,
    readScopes: [], writeScopes: [], schedules: [row], holidays: [{ date: '2026-12-25', name: '성탄절' }],
  };
  jest.mocked(loadEducationMonth).mockResolvedValue(month);
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <DesignSystemProvider>
        <QueryClientProvider client={client}>
          <EducationScheduleScreen />
        </QueryClientProvider>
      </DesignSystemProvider>
    </SafeAreaProvider>,
  );
}

afterEach(() => jest.clearAllMocks());

test('a USER selects a day and reads the full details with no write actions', async () => {
  const ui = renderSchedule('USER', false);
  fireEvent.press(await ui.findByRole('button', { name: '12월 25일 (금), 성탄절, 교육일정 1건' }));
  expect(ui.getByText('12월 25일 (금)')).toBeTruthy();
  expect(ui.getAllByText(row.title)).toHaveLength(2);
  expect(ui.getByRole('button', { name: '출력' })).toBeEnabled();
  expect(ui.queryByRole('button', { name: '일정 등록' })).toBeNull();
  expect(ui.queryByRole('button', { name: /수정|삭제/ })).toBeNull();
});

test('a day tap prefills the server-permitted registration and refreshes the month after saving', async () => {
  const ui = renderSchedule('GA_STAFF', true);
  jest.mocked(saveEducationSchedule).mockResolvedValue({ schedule: { ...row, title: '신규 교육' } });
  fireEvent.press(await ui.findByRole('button', { name: '12월 25일 (금), 성탄절, 교육일정 1건' }));
  fireEvent.changeText(ui.getByLabelText('교육기관/제목'), '신규 교육');
  fireEvent.press(ui.getByRole('button', { name: '등록' }));
  await waitFor(() => expect(saveEducationSchedule).toHaveBeenCalledWith(
    'test-token', { date: '2026-12-25', title: '신규 교육', instructor: '' }, undefined,
  ));
  await waitFor(() => expect(loadEducationMonth).toHaveBeenCalledTimes(2));
  expect(ui.queryByRole('button', { name: /수정|삭제/ })).toBeNull();
});
