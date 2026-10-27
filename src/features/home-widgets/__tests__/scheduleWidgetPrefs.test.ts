import { apiRequest } from '../../../api/client';
import { fetchScheduleEvents } from '../../schedule/scheduleApi';
import { normalizeScheduleEvents } from '../../schedule/scheduleModel';
import { applyScheduleViewPrefs, fetchScheduleViewPrefs, normalizeScheduleViewPrefs, scheduleFilterKeyOf } from '../../schedule/scheduleViewPrefs';
import { scheduleWidgetAdapter, scheduleWidgetPayload } from '../adapters/scheduleWidgetAdapter';

jest.mock('../../../api/client', () => {
  const actual = jest.requireActual('../../../api/client');
  return { ...actual, apiRequest: jest.fn() };
});
jest.mock('../../schedule/scheduleApi', () => ({ fetchScheduleEvents: jest.fn() }));

const api = apiRequest as jest.Mock;
const events = fetchScheduleEvents as jest.Mock;
const google = { connected: true, status: 'connected', connectAllowed: true, configured: true };

function result() {
  return normalizeScheduleEvents({
    from: '2026-10-01',
    to: '2026-12-31',
    google,
    events: [
      { id: 'g:a', source: 'google', sourceId: 'a', calendarId: 'cal-a', type: 'google_event', title: 'A', startAt: '2026-10-27', endAt: '2026-10-28', allDay: true },
      { id: 'g:b', source: 'google', sourceId: 'b', calendarId: 'cal-b', type: 'google_event', title: 'B', startAt: '2026-10-27', endAt: '2026-10-28', allDay: true },
      { id: 'onefc:9', source: 'google', sourceId: '9', calendarId: null, origin: 'onefc', type: 'google_event', title: 'O', startAt: '2026-10-27', endAt: '2026-10-28', allDay: true },
      { id: 'crm:1', source: 'crm', sourceId: '1', type: 'customer_alert', title: '알림', startAt: '2026-10-27', endAt: '2026-10-28', allDay: true },
      { id: 'crm:2', source: 'crm', sourceId: '2', type: 'car_expiry', title: '차', startAt: '2026-10-27', endAt: '2026-10-28', allDay: true },
      { id: 'crm:3', source: 'crm', sourceId: '3', type: 'insurance_age', title: '상령', startAt: '2026-10-27', endAt: '2026-10-28', allDay: true },
    ],
    tasks: [
      { id: 'onefc_todo:1', source: 'onefc_todo', sourceId: '1', title: 'T open', dueDate: '2026-10-27', status: 'open' },
      { id: 'onefc_todo:2', source: 'onefc_todo', sourceId: '2', title: 'T done', dueDate: '2026-10-27', status: 'completed' },
      { id: 'google_task:l:3', source: 'google_task', sourceId: '3', title: 'G open', dueDate: '2026-10-27', status: 'open' },
    ],
  });
}

const ALL = ['google', 'google_task', 'onefc_todo', 'customer_alert', 'car_expiry', 'insurance_age'];
const ids = (payload: ReturnType<typeof scheduleWidgetPayload>) => payload.events.flatMap((day) => day.items.map((item) => item.id)).sort();
const prefs = (extra: Record<string, unknown>) => normalizeScheduleViewPrefs({ sources: ALL, includeCompleted: false, includeOverdue: false, googleCalendarIds: null, holidayMode: 'kr', ...extra });

beforeEach(() => { api.mockReset(); events.mockReset(); });

describe('schedule widget — web schedule-view-prefs SSOT', () => {
  it('maps event keys like the web scheduleFilterKeyOf', () => {
    expect(result().events.map(scheduleFilterKeyOf)).toEqual(['google', 'google', 'google', 'customer_alert', 'car_expiry', 'insurance_age']);
  });

  it('fallback (null prefs) keeps the current default: everything incl. completed', () => {
    const payload = scheduleWidgetPayload(result(), 'onefc', '2026-10-27', null);
    expect(ids(payload)).toHaveLength(9);
    // 배지 수는 기존 countItemsByDay 규칙(완료 할 일 제외) 그대로.
    expect(payload.calendarCounts['2026-10-27']).toBe(8);
  });

  it('all sources ON, completed OFF hides only completed tasks (cells and counts agree)', () => {
    const payload = scheduleWidgetPayload(result(), 'onefc', '2026-10-27', prefs({}));
    expect(ids(payload)).not.toContain('onefc_todo:2');
    expect(payload.calendarCounts['2026-10-27']).toBe(8);
    expect(scheduleWidgetPayload(result(), 'onefc', '2026-10-27', prefs({ includeCompleted: true })).events[0].items.map((item) => item.id)).toContain('onefc_todo:2');
  });

  it.each([
    ['google', ['google_task:l:3', 'onefc_todo:1', 'crm:1', 'crm:2', 'crm:3']],
    ['customer_alert', ['g:a', 'g:b', 'onefc:9', 'google_task:l:3', 'onefc_todo:1', 'crm:2', 'crm:3']],
    ['car_expiry', ['g:a', 'g:b', 'onefc:9', 'google_task:l:3', 'onefc_todo:1', 'crm:1', 'crm:3']],
    ['insurance_age', ['g:a', 'g:b', 'onefc:9', 'google_task:l:3', 'onefc_todo:1', 'crm:1', 'crm:2']],
    ['onefc_todo', ['g:a', 'g:b', 'onefc:9', 'google_task:l:3', 'crm:1', 'crm:2', 'crm:3']],
    ['google_task', ['g:a', 'g:b', 'onefc:9', 'onefc_todo:1', 'crm:1', 'crm:2', 'crm:3']],
  ])('source %s OFF hides only that source', (off, expected) => {
    const payload = scheduleWidgetPayload(result(), 'onefc', '2026-10-27', prefs({ sources: ALL.filter((key) => key !== off) }));
    expect(ids(payload)).toEqual([...expected].sort());
    expect(payload.calendarCounts['2026-10-27']).toBe(expected.length);
  });

  it('할 일 label = onefc_todo + google_task both OFF', () => {
    const payload = scheduleWidgetPayload(result(), 'onefc', '2026-10-27', prefs({ sources: ['google', 'customer_alert', 'car_expiry', 'insurance_age'] }));
    expect(payload.events[0].items.every((item) => item.kind === 'event')).toBe(true);
  });

  it('googleCalendarIds limits only Google-born events, never ONE FC or CRM', () => {
    const filtered = applyScheduleViewPrefs(result(), prefs({ googleCalendarIds: ['cal-a'] }));
    expect(filtered.events.map((event) => event.id)).toEqual(['g:a', 'onefc:9', 'crm:1', 'crm:2', 'crm:3']);
  });

  it('normalize: empty/invalid/unknown → null fallback; unknown keys dropped', () => {
    expect(normalizeScheduleViewPrefs(null)).toBeNull();
    expect(normalizeScheduleViewPrefs({})).toBeNull();
    expect(normalizeScheduleViewPrefs({ sources: [] })).toBeNull();
    expect(normalizeScheduleViewPrefs({ sources: ['nope'] })).toBeNull();
    expect(normalizeScheduleViewPrefs({ sources: ['google', 'nope'], googleCalendarIds: [] })).toEqual({ sources: ['google'], includeCompleted: false, includeOverdue: false, googleCalendarIds: null, holidayMode: null });
  });

  it('fetch attaches the token via apiRequest and never throws (404/timeout → null)', async () => {
    api.mockResolvedValueOnce({ sources: ['google'] });
    await expect(fetchScheduleViewPrefs(' tok ')).resolves.toMatchObject({ sources: ['google'] });
    expect(api).toHaveBeenCalledWith('/api/me/schedule-view-prefs', expect.objectContaining({ token: 'tok', timeoutMs: expect.any(Number) }));
    api.mockRejectedValueOnce(Object.assign(new Error('nf'), { status: 404 }));
    await expect(fetchScheduleViewPrefs('tok')).resolves.toBeNull();
    api.mockRejectedValueOnce(new Error('aborted'));
    await expect(fetchScheduleViewPrefs('tok')).resolves.toBeNull();
    await expect(fetchScheduleViewPrefs(null)).resolves.toBeNull();
    expect(api).toHaveBeenCalledTimes(3);
  });

  it('adapter.load reads latest prefs every load and falls back without error', async () => {
    events.mockResolvedValue(result());
    api.mockResolvedValueOnce({ sources: ['customer_alert'] });
    const first = await scheduleWidgetAdapter.load({ token: 'tok', scheme: 'onefc', today: '2026-10-27', reason: 'foreground' } as never);
    expect(ids(first)).toEqual(['crm:1']);
    api.mockRejectedValueOnce(new Error('500'));
    const second = await scheduleWidgetAdapter.load({ token: 'tok', scheme: 'onefc', today: '2026-10-27', reason: 'manual' } as never);
    expect(ids(second)).toHaveLength(9);
    expect(api).toHaveBeenCalledTimes(2);
  });
});
