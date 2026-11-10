import { fireEvent, render, within } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { ApiError as mockApiError } from '../../../api/client';
import { DesignSystemProvider } from '../../../design-system';
import { ScheduleScreen } from '../ScheduleScreen';
import { normalizeScheduleEvents } from '../scheduleModel';
import { normalizeScheduleViewPrefs } from '../scheduleViewPrefs';
import { SCHEDULE_ITEM_COLORS } from '../scheduleItemColors';

let mockPrefs: ReturnType<typeof normalizeScheduleViewPrefs> = null;
let mockPrefsError = false;
const mockPush = jest.fn();
const mockParams = { date: '2026-11-13' };
const mockFlow = { armScheduleWidgetFlow: jest.fn(), markScheduleWidgetSaved: jest.fn(), endScheduleWidgetFlow: jest.fn() };
const mockData = normalizeScheduleEvents({ events: Array.from({ length: 5 }, (_, id) => ({
  id: `onefc:${id}`, origin: 'onefc', title: `상담 일정 ${id}`, allDay: true,
  startAt: '2026-11-13', endAt: '2026-11-14',
})), tasks: [{ id: 'task:1', sourceId: '1', title: '서류 준비', dueDate: '2026-11-13' }] });

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({}),
  useFocusEffect: jest.fn(),
}));
jest.mock('../../../auth/AuthProvider', () => ({ useAuth: () => ({ token: 'fixture-token', user: { id: 'fixture', gaId: 1 } }) }));
jest.mock('../../home-widgets/widgetReturn', () => ({
  scheduleModalsOpen: () => false,
  shouldStartScheduleWidgetFlow: () => false,
  useScheduleWidgetReturn: () => mockFlow,
  widgetEntryId: () => null,
  widgetTypeOf: () => null,
  isPendingWidgetOrigin: () => false,
}));
jest.mock('../../home-widgets/engine/widgetRefreshCoordinator', () => ({ refreshWidgets: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn((options) => ({ data: options.queryKey[1] === 'view-prefs' ? mockPrefs : mockData, refetch: jest.fn(), isLoading: false, isError: options.queryKey[1] === 'view-prefs' && mockPrefsError, error: mockPrefsError ? new mockApiError('not found', 404) : null })),
  useQueryClient: () => ({ invalidateQueries: jest.fn(), setQueryData: jest.fn() }),
  useMutation: () => ({ mutate: jest.fn(), reset: jest.fn(), isPending: false, isError: false }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
function screen() {
  return render(<SafeAreaProvider initialMetrics={metrics}><DesignSystemProvider><ScheduleScreen /></DesignSystemProvider></SafeAreaProvider>);
}

describe('monthly screen integration with existing forms/routes', () => {
  beforeEach(() => { jest.clearAllMocks(); mockPrefs = null; mockPrefsError = false; });

  it('applies PC source settings to calendar and selected-day list without mutating cached data', () => {
    mockPrefs = normalizeScheduleViewPrefs({ sources: ['onefc_todo'] });
    const ui = screen();
    expect(ui.queryByText('상담 일정 0')).toBeNull();
    expect(ui.getAllByText('서류 준비')).toHaveLength(2);
    expect(ui.getByRole('button', { name: '11월 13일 (금), 일정 1건' })).toBeTruthy();
    expect(mockData.events).toHaveLength(5);
  });

  it('keeps the calendar and selected-day list usable when the optional settings API fails', () => {
    mockPrefsError = true;
    const ui = screen();
    expect(ui.getByText(/표시 설정을 불러오지 못했습니다/)).toBeTruthy();
    expect(ui.getByTestId('schedule-month-calendar')).toBeTruthy();
    expect(ui.queryByRole('button', { name: '표시 설정' })).toBeNull();
    expect(ui.getByText('상담 일정 4')).toBeTruthy();
    fireEvent.press(ui.getByRole('button', { name: '11월 14일 (토), 일정 0건' }));
    expect(ui.getByText('등록된 일정이 없습니다.')).toBeTruthy();
  });

  it('keeps the last successfully read source restrictions during a later settings failure', () => {
    mockPrefs = normalizeScheduleViewPrefs({ sources: ['onefc_todo'] });
    mockPrefsError = true;
    const ui = screen();
    expect(ui.getByText(/마지막으로 확인한 표시 설정을 사용/)).toBeTruthy();
    expect(ui.queryByText('상담 일정 0')).toBeNull();
    expect(ui.getAllByText('서류 준비')).toHaveLength(2);
    expect(ui.getByTestId('schedule-month-calendar')).toBeTruthy();
  });

  it('retains the calendar, shows every selected-day event/task, and has one page scroll', () => {
    const ui = screen();
    expect(ui.getByTestId('schedule-month-calendar')).toBeTruthy();
    expect(ui.getByText('+4')).toBeTruthy();
    for (let index = 2; index < 5; index += 1) expect(ui.getByText(`상담 일정 ${index}`)).toBeTruthy();
    expect(ui.getByText('서류 준비')).toBeTruthy();
    expect(ui.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
    fireEvent.press(ui.getByRole('button', { name: '11월 14일 (토), 일정 0건' }));
    expect(ui.getByText('등록된 일정이 없습니다.')).toBeTruthy();
    expect(ui.getByTestId('schedule-month-calendar')).toBeTruthy();
    expect(ui.queryByText('상담 일정 4')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('seeds the existing creation form with the empty selected date', () => {
    const ui = screen();
    fireEvent.press(ui.getByRole('button', { name: '11월 14일 (토), 일정 0건' }));
    fireEvent.press(ui.getByRole('button', { name: '일정 추가' }));
    expect(ui.getAllByDisplayValue('2026-11-14', { includeHiddenElements: true })).toHaveLength(2);
    expect(ui.getByRole('button', { name: '저장' })).toBeTruthy();
  });

  it('opens the same detail/edit form from a preview chip', () => {
    const ui = screen();
    const calendar = within(ui.getByTestId('schedule-month-calendar'));
    fireEvent.press(calendar.getByRole('button', { name: '11월 13일 (금), 상담 일정 0, 상세 보기' }));
    expect(ui.getByRole('button', { name: '수정' })).toBeTruthy();
    expect(ui.getByRole('button', { name: '삭제' })).toBeTruthy();
    fireEvent.press(ui.getByRole('button', { name: '수정' }));
    expect(ui.getByDisplayValue('상담 일정 0')).toBeTruthy();
  });

  it('colors the Todo list and popup badge consistently while preserving 할 일 열기 instead of event editing', () => {
    const ui = screen();
    expect(StyleSheet.flatten(ui.getByText('서류 준비').props.style).color).toBe(SCHEDULE_ITEM_COLORS.onefc_todo.light.foreground);
    fireEvent.press(ui.getByRole('button', { name: '서류 준비, 할 일 상세 보기' }));
    expect(ui.getByRole('button', { name: '할 일 열기' })).toBeTruthy();
    expect(ui.queryByRole('button', { name: '수정' })).toBeNull();
    expect(ui.queryByRole('button', { name: '삭제' })).toBeNull();
    expect(ui.getAllByText('ONE FC 할 일').some((node) => StyleSheet.flatten(node.props.style)?.color === SCHEDULE_ITEM_COLORS.onefc_todo.light.foreground)).toBe(true);
    fireEvent.press(ui.getByRole('button', { name: '할 일 열기' }));
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/todos/[todoId]/edit', params: expect.objectContaining({ todoId: '1' }) }));
  });

  it('changes the existing monthly query range without a query per cell or selected date', () => {
    const ui = screen();
    const currentKey = () => (useQuery as jest.Mock).mock.calls.filter(([options]) => options.queryKey[1] === 'events').at(-1)![0].queryKey;
    expect(currentKey()).toEqual(['schedule', 'events', '2026-11-01', '2026-11-30']);
    fireEvent.press(ui.getByRole('button', { name: '11월 14일 (토), 일정 0건' }));
    expect(currentKey()).toEqual(['schedule', 'events', '2026-11-01', '2026-11-30']);
    fireEvent.press(ui.getByRole('button', { name: '다음 달' }));
    expect(ui.getByText('2026년 12월')).toBeTruthy();
    expect(currentKey()).toEqual(['schedule', 'events', '2026-12-01', '2026-12-31']);
    fireEvent.press(ui.getByRole('button', { name: '이전 달' }));
    expect(currentKey()).toEqual(['schedule', 'events', '2026-11-01', '2026-11-30']);
  });
});
