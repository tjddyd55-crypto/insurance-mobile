jest.mock('react-native', () => ({ Platform: { OS: 'android' }, AppRegistry: { registerHeadlessTask: jest.fn() } }));
jest.mock('../../../api/client', () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, apiRequest: jest.fn() };
});
jest.mock('../../../auth/secureStorage', () => ({ readAuthSession: jest.fn() }));
jest.mock('../../schedule/scheduleApi', () => ({ createOnefcSchedule: jest.fn() }));
jest.mock('../engine/widgetRefreshCoordinator', () => ({ refreshWidgets: jest.fn(), purgeWidgets: jest.fn() }));

import { AppRegistry } from 'react-native';

import { ApiError } from '../../../api/client';
import { readAuthSession } from '../../../auth/secureStorage';
import { createOnefcSchedule } from '../../schedule/scheduleApi';
import { createdEventId } from '../../schedule/scheduleModel';
import { refreshWidgets } from '../engine/widgetRefreshCoordinator';
import { setWidgetNativeForTests } from '../widgetBridge';
import { registerWidgetHeadlessTask } from '../widgetHeadlessTask';
import { runWidgetQuickAdd, validateQuickAdd, WIDGET_QUICK_ADD_TASK } from '../widgetQuickAdd';

const RID = 'a'.repeat(32);
const session = { token: 'tok', user: { id: 1 } };
const report = jest.fn(async () => true);

function lastReport() {
  const call = report.mock.calls.at(-1) as unknown as [string, string];
  return { requestId: call[0], body: JSON.parse(call[1]) };
}

beforeEach(() => {
  jest.clearAllMocks();
  setWidgetNativeForTests({ reportQuickAddResult: report } as never);
  (readAuthSession as jest.Mock).mockResolvedValue(session);
  (createOnefcSchedule as jest.Mock).mockResolvedValue('onefc:11111111-1111-4111-8111-111111111111');
  (refreshWidgets as jest.Mock).mockResolvedValue({ schedule: 'written' });
});

afterAll(() => setWidgetNativeForTests(undefined));

describe('widget quick add', () => {
  it('validates input', () => {
    expect(validateQuickAdd({ requestId: RID, date: '2026-10-22', title: ' 미팅 ' })).toEqual({ requestId: RID, date: '2026-10-22', title: '미팅', kind: 'event', allDay: true, startTime: '', endTime: '' });
    expect(validateQuickAdd({ requestId: RID, date: '2026-10-22', title: '   ' })).toBeNull();
    expect(validateQuickAdd({ requestId: 'x', date: '2026-10-22', title: '미팅' })).toBeNull();
    expect(validateQuickAdd({ requestId: RID, date: '20261022', title: '미팅' })).toBeNull();
    expect(validateQuickAdd({ requestId: RID, date: '2026-10-22', title: '가'.repeat(201) })).toBeNull();
  });

  it('creates an all-day ONE FC schedule, refreshes the schedule widget, reports the list id', async () => {
    const result = await runWidgetQuickAdd({ requestId: RID, date: '2026-10-22', title: '고객 미팅' });
    expect(createOnefcSchedule).toHaveBeenCalledWith('tok', expect.objectContaining({ calendarId: '', title: '고객 미팅', date: '2026-10-22', endDate: '2026-10-22', allDay: true }), RID);
    expect(refreshWidgets).toHaveBeenCalledWith(session, { reason: 'appMutation', widgetTypes: ['schedule'], force: true });
    expect(result).toEqual({ ok: true, requestId: RID, eventId: 'onefc:11111111-1111-4111-8111-111111111111', date: '2026-10-22', title: '고객 미팅', refreshed: true });
    expect(lastReport()).toEqual({ requestId: RID, body: result });
  });

  it('still reports the created id when the widget refresh fails', async () => {
    (refreshWidgets as jest.Mock).mockRejectedValue(new Error('x'));
    const result = await runWidgetQuickAdd({ requestId: RID, date: '2026-10-22', title: '미팅' });
    expect(result).toMatchObject({ ok: true, eventId: 'onefc:11111111-1111-4111-8111-111111111111', refreshed: false });
  });

  it('logged out → login, no server call', async () => {
    (readAuthSession as jest.Mock).mockResolvedValue(null);
    const result = await runWidgetQuickAdd({ requestId: RID, date: '2026-10-22', title: '미팅' });
    expect(result).toMatchObject({ ok: false, code: 'login' });
    expect(createOnefcSchedule).not.toHaveBeenCalled();
  });

  it('maps server and network errors to inline messages', async () => {
    (createOnefcSchedule as jest.Mock).mockRejectedValue(new ApiError('입력값을 확인해 주세요.', 400));
    expect(await runWidgetQuickAdd({ requestId: RID, date: '2026-10-22', title: '미팅' })).toMatchObject({ ok: false, code: 'server', message: '입력값을 확인해 주세요.' });
    (createOnefcSchedule as jest.Mock).mockRejectedValue(new ApiError('', 401));
    expect(await runWidgetQuickAdd({ requestId: RID, date: '2026-10-22', title: '미팅' })).toMatchObject({ ok: false, code: 'login' });
    (createOnefcSchedule as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));
    expect(await runWidgetQuickAdd({ requestId: RID, date: '2026-10-22', title: '미팅' })).toMatchObject({ ok: false, code: 'network' });
  });

  it('invalid payload is reported, not saved', async () => {
    expect(await runWidgetQuickAdd({ requestId: RID, date: '2026-10-22', title: '' })).toMatchObject({ ok: false, code: 'invalid' });
    expect(createOnefcSchedule).not.toHaveBeenCalled();
  });

  it('never logs the title', async () => {
    const spies = (['log', 'warn', 'error', 'info'] as const).map((k) => jest.spyOn(console, k).mockImplementation(() => {}));
    (createOnefcSchedule as jest.Mock).mockRejectedValue(new Error('boom'));
    await runWidgetQuickAdd({ requestId: RID, date: '2026-10-22', title: '홍길동 010-1234-5678' });
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain('홍길동');
      spy.mockRestore();
    }
  });

  it('registers the headless task', () => {
    registerWidgetHeadlessTask();
    const names = (AppRegistry.registerHeadlessTask as jest.Mock).mock.calls.map((c) => c[0]);
    expect(names).toContain(WIDGET_QUICK_ADD_TASK);
  });

  it('reads the created event id with the list normalization', () => {
    const event = { id: 'onefc:11111111-1111-4111-8111-111111111111', startAt: '2026-10-22', title: '미팅', type: 'google_event', source: 'google', origin: 'onefc' };
    expect(createdEventId({ success: true, data: { event, duplicate: true } })).toBe('onefc:11111111-1111-4111-8111-111111111111');
    expect(createdEventId({ event })).toBe(event.id);
    expect(createdEventId({ data: {} })).toBeNull();
  });
});
