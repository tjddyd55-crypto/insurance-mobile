import { ApiError } from '../../../api/client';
import { setWidgetNativeForTests } from '../widgetBridge';
import { purgeHomeWidgets, resetWidgetSyncStateForTests, syncHomeWidgets } from '../widgetSync';
import { runWidgetHeadlessRefresh } from '../widgetHeadlessTask';

jest.mock('react-native', () => ({ Platform: { OS: 'android' }, AppRegistry: { registerHeadlessTask: jest.fn() } }));
jest.mock('../../../config/environment', () => ({ getEnvironmentConfig: () => ({ scheme: 'onefc' }) }));
jest.mock('../../schedule/scheduleApi', () => ({ fetchScheduleEvents: jest.fn() }));
jest.mock('../../todos/todosApi', () => ({ listTodos: jest.fn() }));
jest.mock('../../../auth/secureStorage', () => ({ readAuthSession: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetchScheduleEvents } = require('../../schedule/scheduleApi') as { fetchScheduleEvents: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { listTodos } = require('../../todos/todosApi') as { listTodos: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readAuthSession } = require('../../../auth/secureStorage') as { readAuthSession: jest.Mock };

const emptySchedule = { from: '', to: '', events: [], tasks: [], fetchedAt: '', google: { connected: false, status: 'disconnected', connectAllowed: true, configured: true, write: { enabled: false, calendarWritable: false, tasksWritable: false, needsWriteConsent: false }, tasks: { status: 'skipped', needsReconsent: false } } };

function nativeMock(widgets = 1) {
  let stored: string | null = null;
  const native = {
    configure: jest.fn(async () => undefined),
    writeSnapshot: jest.fn(async (json: string) => {
      stored = json;
      return true;
    }),
    readSnapshot: jest.fn(async () => stored),
    clearSnapshot: jest.fn(async () => {
      stored = null;
    }),
    installedWidgetCount: jest.fn(async () => widgets),
  };
  setWidgetNativeForTests(native);
  return { native, stored: () => (stored ? JSON.parse(stored) : null) };
}

const session = { token: 'secret-token', user: { id: 'u1', gaId: 2 } };
const now = new Date('2026-10-21T03:00:00Z');

beforeEach(() => {
  resetWidgetSyncStateForTests();
  fetchScheduleEvents.mockReset().mockResolvedValue(emptySchedule);
  listTodos.mockReset().mockResolvedValue([]);
});

describe('widget sync', () => {
  it('writes a snapshot without the token', async () => {
    const { native, stored } = nativeMock();
    await expect(syncHomeWidgets(session, 'login', { now })).resolves.toBe('written');
    expect(native.writeSnapshot).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(stored())).not.toContain('secret-token');
    expect(fetchScheduleEvents).toHaveBeenCalledWith('secret-token', { from: '2026-09-01', to: '2026-12-31' });
  });

  it('does nothing when no widget is installed', async () => {
    const { native } = nativeMock(0);
    await expect(syncHomeWidgets(session, 'login', { now })).resolves.toBe('no_widgets');
    expect(fetchScheduleEvents).not.toHaveBeenCalled();
    expect(native.writeSnapshot).not.toHaveBeenCalled();
  });

  it('throttles automatic syncs but not app changes', async () => {
    nativeMock();
    await syncHomeWidgets(session, 'login', { now });
    await expect(syncHomeWidgets(session, 'foreground', { now: new Date(now.getTime() + 5_000) })).resolves.toBe('skipped');
    await expect(syncHomeWidgets(session, 'app_change', { now: new Date(now.getTime() + 6_000) })).resolves.toBe('written');
  });

  it('manual refresh uses refresh=1 and falls back on 429', async () => {
    nativeMock();
    fetchScheduleEvents.mockRejectedValueOnce(new ApiError('limited', 429));
    await expect(syncHomeWidgets(session, 'manual', { now })).resolves.toBe('written');
    expect(fetchScheduleEvents.mock.calls[0][1]).toMatchObject({ refresh: true });
    expect(fetchScheduleEvents.mock.calls[1][1]).not.toHaveProperty('refresh');
  });

  it('purges on 401 (session expired)', async () => {
    const { native } = nativeMock();
    listTodos.mockRejectedValueOnce(new ApiError('expired', 401));
    await expect(syncHomeWidgets(session, 'periodic', { now, force: true })).resolves.toBe('session_expired');
    expect(native.clearSnapshot).toHaveBeenCalledWith('session_expired');
    expect(native.writeSnapshot).not.toHaveBeenCalled();
  });

  it('keeps last cache when offline (both requests fail)', async () => {
    const { native } = nativeMock();
    fetchScheduleEvents.mockRejectedValueOnce(new TypeError('Network request failed'));
    listTodos.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(syncHomeWidgets(session, 'periodic', { now, force: true })).resolves.toBe('failed');
    expect(native.clearSnapshot).not.toHaveBeenCalled();
  });

  it('clears the previous account before writing a new one', async () => {
    const { native, stored } = nativeMock();
    await syncHomeWidgets(session, 'login', { now });
    await syncHomeWidgets({ token: 't2', user: { id: 'u9', gaId: 3 } }, 'login', { now });
    expect(native.clearSnapshot).toHaveBeenCalledWith('account_changed');
    expect(stored().accountKey).toBe('u:u9|ga:3');
  });

  it('logout purge and null session clear widgets', async () => {
    const { native } = nativeMock();
    await purgeHomeWidgets('logged_out');
    await syncHomeWidgets(null, 'foreground');
    expect(native.clearSnapshot).toHaveBeenCalledWith('logged_out');
  });

  it('headless task: no session → purge; session → forced sync', async () => {
    const { native } = nativeMock();
    readAuthSession.mockResolvedValueOnce(null);
    await runWidgetHeadlessRefresh({ reason: 'periodic' });
    expect(native.clearSnapshot).toHaveBeenCalledWith('logged_out');
    readAuthSession.mockResolvedValueOnce(session);
    await runWidgetHeadlessRefresh({ reason: 'bogus' });
    expect(native.writeSnapshot).toHaveBeenCalled();
  });

  it('no native module (1.0.4 binary / iOS) is a silent no-op', async () => {
    setWidgetNativeForTests(null);
    await expect(syncHomeWidgets(session, 'login', { now })).resolves.toBe('no_widgets');
    await expect(purgeHomeWidgets()).resolves.toBeUndefined();
  });
});
