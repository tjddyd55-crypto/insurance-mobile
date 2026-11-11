import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DesignSystemProvider } from '../../../design-system';
import { NotificationSettingsScreen } from '../NotificationSettingsScreen';
import { DEFAULT_ALERT_SETTINGS } from '../notificationModel';
import { getNotificationSettings, saveNotificationSettings } from '../notificationsApi';
import { DEFAULT_SCHEDULE_VIEW_PREFS, fetchScheduleViewPrefs, saveScheduleViewPrefs } from '../../schedule/scheduleViewPrefs';
import { refreshWidgets } from '../../home-widgets/engine/widgetRefreshCoordinator';
import { fetchGoogleAutoSync, saveGoogleAutoSync } from '../googleCalendarAutoSyncApi';
jest.mock('../../schedule/scheduleViewPrefs', () => ({ ...jest.requireActual('../../schedule/scheduleViewPrefs'), fetchScheduleViewPrefs: jest.fn(), saveScheduleViewPrefs: jest.fn() }));
jest.mock('../../home-widgets/engine/widgetRefreshCoordinator', () => ({ refreshWidgets: jest.fn(async () => undefined) }));
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('../../../auth/AuthProvider', () => ({ useAuth: () => ({ token: 'fixture', user: { id: 'fixture' } }) }));
jest.mock('../../../components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('../../push/pushRegistration', () => ({ getOsNotificationPermissionGranted: jest.fn(async () => false), openOsNotificationSettings: jest.fn(), syncPushRegistrationIfPermitted: jest.fn() }));
jest.mock('../notificationsApi', () => ({ getNotificationSettings: jest.fn(), saveNotificationSettings: jest.fn() }));
jest.mock('../googleCalendarAutoSyncApi', () => ({ ...jest.requireActual('../googleCalendarAutoSyncApi'), fetchGoogleAutoSync: jest.fn(), saveGoogleAutoSync: jest.fn() }));
const state = { enabled: true, available: true, connected: true, calendarWritable: true, windowDays: 90, syncStatus: 'done', kinds: { todo: true, car_expiry: true, insurance_age_date: false, special_date: true } };
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
function screen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const ui = render(<QueryClientProvider client={client}><SafeAreaProvider initialMetrics={metrics}><DesignSystemProvider><NotificationSettingsScreen /></DesignSystemProvider></SafeAreaProvider></QueryClientProvider>);
  return { ...ui, client };
}
beforeEach(() => {
  jest.clearAllMocks();
  (fetchScheduleViewPrefs as jest.Mock).mockResolvedValue(DEFAULT_SCHEDULE_VIEW_PREFS);
  (saveScheduleViewPrefs as jest.Mock).mockImplementation(async (_token, patch) => ({ ...DEFAULT_SCHEDULE_VIEW_PREFS, ...patch }));
  (getNotificationSettings as jest.Mock).mockResolvedValue(DEFAULT_ALERT_SETTINGS);
  (saveNotificationSettings as jest.Mock).mockResolvedValue(DEFAULT_ALERT_SETTINGS);
  (fetchGoogleAutoSync as jest.Mock).mockResolvedValue(state);
  (saveGoogleAutoSync as jest.Mock).mockImplementation(async (_token, input) => ({ ...state, ...input }));
});
it('reads existing PC preferences without writes, and saves only after explicit user action', async () => {
  const ui = screen();
  const toggle = await ui.findByLabelText('Google 자동 연동 상령일 알림');
  expect(toggle.props.value).toBe(false);
  expect(saveGoogleAutoSync).not.toHaveBeenCalled();
  expect(saveNotificationSettings).not.toHaveBeenCalled();
  fireEvent(toggle, 'valueChange', true);
  expect(saveGoogleAutoSync).not.toHaveBeenCalled();
  fireEvent.press(ui.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(saveGoogleAutoSync).toHaveBeenCalledWith('fixture', { enabled: true, kinds: { ...state.kinds, insurance_age_date: true } });
  expect(saveNotificationSettings).not.toHaveBeenCalled();
});
it('keeps the user on the screen and reports a partial save when Google fails', async () => {
  (saveGoogleAutoSync as jest.Mock).mockRejectedValue(new Error('offline'));
  const ui = screen();
  fireEvent(await ui.findByLabelText('Google 자동 연동 상령일 알림'), 'valueChange', true);
  const appMaster = ui.getAllByRole('switch')[0]!;
  fireEvent(appMaster, 'valueChange', !appMaster.props.value);
  fireEvent.press(ui.getByRole('button', { name: '저장' }));
  expect(await ui.findByText(/앱 알림 설정은 저장했지만 Google 자동 연동 설정은 저장하지 못했습니다/)).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
  expect(ui.getByLabelText('Google 자동 연동 상령일 알림').props.value).toBe(true);
});
it('allows app alert settings to save when Google settings cannot be read', async () => {
  (fetchGoogleAutoSync as jest.Mock).mockRejectedValue(new Error('offline'));
  const ui = screen();
  expect(await ui.findByRole('button', { name: 'Google 자동 연동 다시 시도' })).toBeTruthy();
  fireEvent.press(ui.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(saveGoogleAutoSync).not.toHaveBeenCalled();
});

it('reads Web Google changes on refetch without replacing an unsaved local edit', async () => {
  const ui = screen();
  await ui.findByLabelText('Google 자동 연동 상령일 알림');
  (fetchGoogleAutoSync as jest.Mock).mockResolvedValue({ ...state, kinds: { ...state.kinds, insurance_age_date: true } });
  await act(async () => { await ui.client.invalidateQueries({ queryKey: ['notifications', 'google-autosync'] }); });
  await waitFor(() => expect(ui.getByLabelText('Google 자동 연동 상령일 알림').props.value).toBe(true));
  fireEvent(ui.getByLabelText('Google 자동 연동 상령일 알림'), 'valueChange', false);
  await act(async () => { await ui.client.invalidateQueries({ queryKey: ['notifications', 'google-autosync'] }); });
  expect(ui.getByLabelText('Google 자동 연동 상령일 알림').props.value).toBe(false);
  expect(saveGoogleAutoSync).not.toHaveBeenCalled();
});

it('edits calendar/widget visibility in notification settings and saves only on Save', async () => {
  const ui = screen();
  const toggle = await ui.findByLabelText('달력 표시 상령일');
  expect(ui.getByText('일정·위젯 표시')).toBeTruthy();
  fireEvent(toggle, 'valueChange', false);
  expect(saveScheduleViewPrefs).not.toHaveBeenCalled();
  fireEvent.press(ui.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(saveScheduleViewPrefs).toHaveBeenCalledWith('fixture', { sources: DEFAULT_SCHEDULE_VIEW_PREFS.sources.filter(key => key !== 'insurance_age') });
  expect(saveGoogleAutoSync).not.toHaveBeenCalled();
  expect(saveNotificationSettings).not.toHaveBeenCalled();
  expect(refreshWidgets).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ widgetTypes: ['schedule'], force: true }));
});

it('keeps a failed visibility save open and does not report success', async () => {
  (saveScheduleViewPrefs as jest.Mock).mockRejectedValue(new Error('offline'));
  const ui = screen();
  fireEvent(await ui.findByLabelText('달력 표시 상령일'), 'valueChange', false);
  fireEvent.press(ui.getByRole('button', { name: '저장' }));
  expect(await ui.findByText(/일정·위젯 표시 설정을 저장하지 못했습니다/)).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

it('keeps alert settings usable when the display preferences API fails', async () => {
  (fetchScheduleViewPrefs as jest.Mock).mockRejectedValue(new Error('offline'));
  const ui = screen();
  await ui.findByRole('button', { name: '표시 항목 다시 확인' });
  const master = ui.getAllByRole('switch')[0]!;
  fireEvent(master, 'valueChange', !master.props.value);
  fireEvent.press(ui.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(saveNotificationSettings).toHaveBeenCalledTimes(1);
  expect(saveScheduleViewPrefs).not.toHaveBeenCalled();
});

it('reads Web display changes on refetch and preserves unsaved local toggles', async () => {
  const ui = screen();
  await ui.findByLabelText('달력 표시 완료 포함');
  (fetchScheduleViewPrefs as jest.Mock).mockResolvedValue({ ...DEFAULT_SCHEDULE_VIEW_PREFS, includeCompleted: true });
  await act(async () => { await ui.client.invalidateQueries({ queryKey: ['schedule', 'view-prefs'] }); });
  await waitFor(() => expect(ui.getByLabelText('달력 표시 완료 포함').props.value).toBe(true));
  fireEvent(ui.getByLabelText('달력 표시 완료 포함'), 'valueChange', false);
  await act(async () => { await ui.client.invalidateQueries({ queryKey: ['schedule', 'view-prefs'] }); });
  expect(ui.getByLabelText('달력 표시 완료 포함').props.value).toBe(false);
  expect(saveScheduleViewPrefs).not.toHaveBeenCalled();
});

it('does not repeat a successful display save after a later Google save failure', async () => {
  (saveGoogleAutoSync as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  const ui = screen();
  fireEvent(await ui.findByLabelText('달력 표시 완료 포함'), 'valueChange', true);
  fireEvent(await ui.findByLabelText('Google 자동 연동 상령일 알림'), 'valueChange', true);
  fireEvent.press(ui.getByRole('button', { name: '저장' }));
  await ui.findByText(/일정·위젯 표시 설정은 저장했지만 Google/);
  expect(mockBack).not.toHaveBeenCalled();
  fireEvent.press(ui.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(saveScheduleViewPrefs).toHaveBeenCalledTimes(1);
  expect(saveGoogleAutoSync).toHaveBeenCalledTimes(2);
});
