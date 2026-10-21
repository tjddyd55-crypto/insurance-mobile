import { ApiError } from '../../../api/client';
import { setWidgetNativeForTests } from '../widgetBridge';
import { widgetChangeForQueryAction, widgetTypesForMutationKey } from '../useHomeWidgetSync';
import { runWidgetHeadlessRefresh, WIDGET_HEADLESS_TASK } from '../widgetHeadlessTask';
import { parseWidgetEnvelope, WIDGET_ENGINE_SCHEMA_VERSION, widgetAccountKey } from '../engine/widgetEnvelope';
import { enabledWidgetTypes, WIDGET_REGISTRY, widgetDefinition, widgetTypesWatching } from '../engine/widgetRegistry';
import { purgeWidgets, refreshWidgets, resetWidgetRefreshStateForTests, shouldRun } from '../engine/widgetRefreshCoordinator';
import { WIDGET_REFRESH_REASONS, WIDGET_TYPES, widgetRefreshReason } from '../engine/widgetTypes';

jest.mock('react-native', () => ({ Platform: { OS: 'android' }, AppRegistry: { registerHeadlessTask: jest.fn() } }));
jest.mock('../../../config/environment', () => ({ getEnvironmentConfig: () => ({ scheme: 'onefc' }) }));
jest.mock('../../schedule/scheduleApi', () => ({ fetchScheduleEvents: jest.fn() }));
jest.mock('../../todos/todosApi', () => ({ listTodos: jest.fn() }));
jest.mock('../../../auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../../../auth/secureStorage', () => ({ readAuthSession: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetchScheduleEvents } = require('../../schedule/scheduleApi') as { fetchScheduleEvents: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { listTodos } = require('../../todos/todosApi') as { listTodos: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readAuthSession } = require('../../../auth/secureStorage') as { readAuthSession: jest.Mock };

const emptySchedule = { from: '', to: '', events: [], tasks: [], fetchedAt: '', google: { connected: false, status: 'disconnected', connectAllowed: true, configured: true, write: { enabled: false, calendarWritable: false, tasksWritable: false, needsWriteConsent: false }, tasks: { status: 'skipped', needsReconsent: false } } };

function nativeMock(installed: string[] = ['schedule', 'todo']) {
  const store = new Map<string, string>();
  const native = {
    configure: jest.fn(async () => undefined),
    writeEnvelope: jest.fn(async (type: string, json: string) => {
      store.set(type, json);
      return true;
    }),
    readEnvelope: jest.fn(async (type: string) => store.get(type) ?? null),
    clearAll: jest.fn(async () => {
      store.clear();
    }),
    installedWidgetTypes: jest.fn(async () => installed),
  };
  setWidgetNativeForTests(native);
  return { native, store, get: (type: string) => (store.get(type) ? JSON.parse(store.get(type)!) : null) };
}

const session = { token: 'secret-token', user: { id: 'u1', gaId: 2 } };
const now = new Date('2026-10-21T03:00:00Z');

beforeEach(() => {
  resetWidgetRefreshStateForTests();
  fetchScheduleEvents.mockReset().mockResolvedValue(emptySchedule);
  listTodos.mockReset().mockResolvedValue([]);
});

describe('widget registry', () => {
  it('registers schedule and todo as the only enabled widgets', () => {
    expect(enabledWidgetTypes()).toEqual(['schedule', 'todo']);
    expect(WIDGET_REGISTRY.schedule.displayName).toBe('ONE FC 일정');
    expect(WIDGET_REGISTRY.todo.displayName).toBe('ONE FC 할 일');
    expect(WIDGET_REGISTRY.schedule.refreshPolicy).toMatchObject({ periodicMinutes: 30, manualCooldownMs: 30_000, onMutation: 'immediate' });
  });

  it('declares future widgets but keeps them disabled with no adapter', () => {
    for (const type of ['notifications', 'consultation', 'claims', 'customerSummary', 'quickActions', 'aiAssistant'] as const) {
      expect(WIDGET_REGISTRY[type].enabled).toBe(false);
      expect(WIDGET_REGISTRY[type].adapter).toBeNull();
    }
    expect(WIDGET_REGISTRY.quickActions.dataKind).toBe('none');
    expect(WIDGET_REGISTRY.notifications.dataKind).toBe('list');
    expect(WIDGET_TYPES).toHaveLength(8);
  });

  it('unknown widget types are safe', () => {
    expect(widgetDefinition('weather')).toBeNull();
    expect(widgetTypesWatching('nothing')).toEqual([]);
    expect(widgetTypesWatching('todos')).toContain('todo');
  });

  it('refresh reasons are a closed set with a safe fallback', () => {
    expect(WIDGET_REFRESH_REASONS).toEqual(expect.arrayContaining(['login', 'appForeground', 'appMutation', 'manual', 'periodic', 'boot', 'midnight', 'appUpdate', 'googleReconnect', 'accountChanged']));
    expect(widgetRefreshReason('bogus')).toBe('periodic');
    expect(widgetRefreshReason('manual')).toBe('manual');
  });
});

describe('widget envelope', () => {
  const valid = { schemaVersion: 1, widgetType: 'todo', accountKey: 'u:u1|ga:2', gaId: 2, userId: 'u1', scheme: 'onefc', generatedAt: now.toISOString(), lastSuccessfulSyncAt: null, timeZone: 'Asia/Seoul', authState: 'signed_in', syncState: 'ready', errorCode: null, payload: { todos: [] } };

  it('accepts the current schema and ignores future fields', () => {
    expect(WIDGET_ENGINE_SCHEMA_VERSION).toBe(1);
    expect(parseWidgetEnvelope(JSON.stringify({ ...valid, futureField: { x: 1 } }), 'todo')).not.toBeNull();
    expect(widgetAccountKey({ id: 'u1', gaId: 2 })).toBe('u:u1|ga:2');
  });

  it('rejects other versions, corrupted json, wrong or unknown types', () => {
    expect(parseWidgetEnvelope(JSON.stringify({ ...valid, schemaVersion: 2 }))).toBeNull();
    expect(parseWidgetEnvelope('{broken')).toBeNull();
    expect(parseWidgetEnvelope(JSON.stringify(valid), 'schedule')).toBeNull();
    expect(parseWidgetEnvelope(JSON.stringify({ ...valid, widgetType: 'weather' }))).toBeNull();
  });
});

describe('refresh coordinator', () => {
  it('writes one envelope per installed widget without the token', async () => {
    const { get } = nativeMock();
    const result = await refreshWidgets(session, { reason: 'login', now });
    expect(result).toMatchObject({ schedule: 'written', todo: 'written' });
    expect(get('schedule')).toMatchObject({ schemaVersion: 1, widgetType: 'schedule', accountKey: 'u:u1|ga:2', timeZone: 'Asia/Seoul', syncState: 'ready' });
    expect(get('schedule').payload).toMatchObject({ visibleRange: { from: '2026-09-01', to: '2026-12-31' }, selectedDate: '2026-10-21' });
    expect(get('todo').payload).toMatchObject({ selectedDate: '2026-10-21', todos: [] });
    expect(JSON.stringify([get('schedule'), get('todo')])).not.toContain('secret-token');
  });

  it('only refreshes installed and requested types', async () => {
    nativeMock(['todo']);
    expect(await refreshWidgets(session, { reason: 'login', now })).toEqual({ todo: 'written' });
    expect(fetchScheduleEvents).not.toHaveBeenCalled();
    nativeMock([]);
    expect(await refreshWidgets(session, { reason: 'login', now })).toEqual({});
  });

  it('applies the policy per reason', async () => {
    nativeMock();
    await refreshWidgets(session, { reason: 'login', now });
    const soon = new Date(now.getTime() + 5_000);
    expect(await refreshWidgets(session, { reason: 'appForeground', now: soon })).toEqual({ schedule: 'skipped', todo: 'skipped' });
    expect(await refreshWidgets(session, { reason: 'appMutation', widgetTypes: ['todo'], now: soon })).toEqual({ todo: 'written' });
    expect(shouldRun('claims', 'manual', true, 0)).toBe(false);
  });

  it('manual uses refresh=1 and falls back on 429', async () => {
    nativeMock(['schedule']);
    fetchScheduleEvents.mockRejectedValueOnce(new ApiError('limited', 429));
    expect(await refreshWidgets(session, { reason: 'manual', now })).toEqual({ schedule: 'written' });
    expect(fetchScheduleEvents.mock.calls[0][1]).toMatchObject({ refresh: true });
    expect(fetchScheduleEvents.mock.calls[1][1]).not.toHaveProperty('refresh');
  });

  it('purges every widget on 401', async () => {
    const { native } = nativeMock();
    listTodos.mockRejectedValueOnce(new ApiError('expired', 401));
    expect(await refreshWidgets(session, { reason: 'periodic', force: true, now })).toMatchObject({ purged: 'session_expired' });
    expect(native.clearAll).toHaveBeenCalledWith('session_expired');
    expect(native.writeEnvelope).not.toHaveBeenCalled();
  });

  it('403 is a per-widget failure, not a session purge (other widget keeps its data)', async () => {
    const { native, get } = nativeMock();
    await refreshWidgets(session, { reason: 'login', now });
    listTodos.mockRejectedValueOnce(new ApiError('forbidden', 403));
    const result = await refreshWidgets(session, { reason: 'manual', now });
    expect(result).toEqual({ schedule: 'written', todo: 'stale' });
    expect(native.clearAll).not.toHaveBeenCalled();
    expect(get('todo')).toMatchObject({ syncState: 'stale', errorCode: 'forbidden' });
    expect(get('schedule')).toMatchObject({ syncState: 'ready' });
  });

  it('keeps the last payload as stale when offline, error when none', async () => {
    const { get } = nativeMock(['todo']);
    listTodos.mockRejectedValueOnce(new ApiError('offline', 0));
    expect(await refreshWidgets(session, { reason: 'periodic', force: true, now })).toEqual({ todo: 'stale' });
    expect(get('todo')).toMatchObject({ syncState: 'error', errorCode: 'network', payload: null });
    await refreshWidgets(session, { reason: 'login', now });
    listTodos.mockRejectedValueOnce(new ApiError('server says secret detail', 500));
    await refreshWidgets(session, { reason: 'manual', now });
    expect(get('todo')).toMatchObject({ syncState: 'stale', errorCode: 'server' });
    expect(get('todo').payload).not.toBeNull();
    expect(JSON.stringify(get('todo'))).not.toContain('secret detail');
  });

  it('purges on account change before writing the new account', async () => {
    const { native, get } = nativeMock();
    await refreshWidgets(session, { reason: 'login', now });
    await refreshWidgets({ token: 't2', user: { id: 'u9', gaId: 3 } }, { reason: 'accountChanged', now });
    expect(native.clearAll).toHaveBeenCalledWith('account_changed');
    expect(get('schedule').accountKey).toBe('u:u9|ga:3');
  });

  it('logout purge and null session clear all widgets', async () => {
    const { native } = nativeMock();
    await purgeWidgets('logged_out');
    await refreshWidgets(null, { reason: 'appForeground' });
    expect(native.clearAll).toHaveBeenCalledWith('logged_out');
  });

  it('single headless entry: no session → purge; filters unknown types and reasons', async () => {
    expect(WIDGET_HEADLESS_TASK).toBe('OneFcWidgetsRefresh');
    const { native } = nativeMock();
    readAuthSession.mockResolvedValueOnce(null);
    await runWidgetHeadlessRefresh({ widgetTypes: ['todo'], reason: 'periodic' });
    expect(native.clearAll).toHaveBeenCalledWith('logged_out');
    readAuthSession.mockResolvedValueOnce(session);
    await runWidgetHeadlessRefresh({ widgetTypes: ['todo', 'weather'], reason: 'bogus', force: true, appWidgetIds: [5] });
    expect(native.writeEnvelope).toHaveBeenCalledWith('todo', expect.any(String));
    expect(native.writeEnvelope).not.toHaveBeenCalledWith('schedule', expect.any(String));
  });

  it('no native module (1.0.4 binary / iOS) is a silent no-op', async () => {
    setWidgetNativeForTests(null);
    expect(await refreshWidgets(session, { reason: 'login', now })).toEqual({});
    await expect(purgeWidgets('logged_out')).resolves.toBeUndefined();
  });
});

describe('app-side mutation triggers', () => {
  it('only widget-data invalidations or tagged mutations refresh widgets', () => {
    expect(widgetChangeForQueryAction('invalidate', false)).toBe('appMutation');
    expect(widgetChangeForQueryAction('success', true)).toBe('googleReconnect');
    expect(widgetChangeForQueryAction('success', false)).toBeNull();
    expect(widgetChangeForQueryAction('fetch', false)).toBeNull();
    expect(widgetTypesForMutationKey(undefined)).toEqual([]);
    expect(widgetTypesForMutationKey(['uploads'])).toEqual([]);
    expect(widgetTypesForMutationKey(['todos', 'create'])).toEqual(['todo']);
    expect(widgetTypesForMutationKey(['schedule'])).toEqual(['schedule', 'todo']);
  });
});
