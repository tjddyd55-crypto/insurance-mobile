import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DesignSystemProvider } from '../../../design-system';
import { NotificationSettingsScreen } from '../NotificationSettingsScreen';
import { DEFAULT_ALERT_SETTINGS } from '../notificationModel';
import { getNotificationSettings, saveNotificationSettings } from '../notificationsApi';
import { fetchGoogleAutoSync, saveGoogleAutoSync } from '../googleCalendarAutoSyncApi';
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: jest.fn() }) }));
jest.mock('../../../auth/AuthProvider', () => ({ useAuth: () => ({ token: 'fixture', user: { id: 'fixture' } }) }));
jest.mock('../../../components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('../../push/pushRegistration', () => ({ getOsNotificationPermissionGranted: jest.fn(async () => false), openOsNotificationSettings: jest.fn(), syncPushRegistrationIfPermitted: jest.fn() }));
jest.mock('../notificationsApi', () => ({ getNotificationSettings: jest.fn(), saveNotificationSettings: jest.fn() }));
jest.mock('../googleCalendarAutoSyncApi', () => ({ ...jest.requireActual('../googleCalendarAutoSyncApi'), fetchGoogleAutoSync: jest.fn(), saveGoogleAutoSync: jest.fn() }));
const state = { enabled: true, available: true, connected: true, calendarWritable: true, windowDays: 90, syncStatus: 'done', kinds: { todo: true, car_expiry: true, insurance_age_date: false, special_date: true } };
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
function screen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><SafeAreaProvider initialMetrics={metrics}><DesignSystemProvider><NotificationSettingsScreen /></DesignSystemProvider></SafeAreaProvider></QueryClientProvider>);
}
beforeEach(() => {
  jest.clearAllMocks();
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
});
it('keeps the user on the screen and reports a partial save when Google fails', async () => {
  (saveGoogleAutoSync as jest.Mock).mockRejectedValue(new Error('offline'));
  const ui = screen();
  fireEvent(await ui.findByLabelText('Google 자동 연동 상령일 알림'), 'valueChange', true);
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
