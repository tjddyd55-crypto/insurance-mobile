import { ApiError, apiRequest } from '../../../api/client';
import {
  createOnefcSchedule,
  createScheduleEvent,
  deleteOnefcSchedule,
  deleteScheduleEvent,
  fetchScheduleEvents,
  fetchWritableCalendars,
  updateOnefcSchedule,
  updateScheduleEvent,
} from '../scheduleApi';
import {
  canCreateGoogleEvent,
  canEditEvent,
  isOnefcSchedule,
  onefcScheduleRawId,
  scheduleDeletePrompt,
  scheduleEventSourceLabel,
  customerRouteOfEvent,
  customerRouteOfTask,
  countItemsByDay,
  dayCountLabel,
  daysWithItems,
  eventDayRange,
  eventTimeLabel,
  eventToForm,
  eventsOnDay,
  formToGoogleInput,
  monthGrid,
  monthRange,
  newScheduleRequestId,
  normalizeScheduleEvents,
  readOnlyMessage,
  shiftMonth,
  tasksOnDay,
  todoRouteOfTask,
  validateEventForm,
} from '../scheduleModel';
import type { ScheduleEvent } from '../types';

jest.mock('../../../api/client', () => {
  const actual = jest.requireActual('../../../api/client');
  return { ...actual, apiRequest: jest.fn() };
});

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const mockedRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

const writeOn = { connected: true, status: 'connected', connectAllowed: true, configured: true, write: { enabled: true, calendarWritable: true, tasksWritable: true, needsWriteConsent: false }, tasks: { status: 'connected', needsReconsent: false } };
const writeOff = { connected: true, status: 'connected', connectAllowed: true, configured: true, write: { enabled: false, calendarWritable: false, tasksWritable: false, needsWriteConsent: false }, tasks: { status: 'connected', needsReconsent: false } };

function serverPayload() {
  return {
    from: '2026-10-01',
    to: '2026-10-31',
    google: { ...writeOn },
    events: [
      { id: 'google:primary:abc', source: 'google', sourceId: 'abc', calendarId: 'primary', calendarName: '내 캘린더', type: 'google_event', title: '미팅', description: '', startAt: '2026-10-19T14:00:00+09:00', endAt: '2026-10-19T15:30:00+09:00', allDay: false, customerId: null, customerName: '', location: '강남', readOnly: true, writable: true, readOnlyReason: '' },
      { id: 'crm:car:1', source: 'crm', sourceId: '1', calendarId: null, type: 'car_expiry', title: '자동차 만기', startAt: '2026-10-20', endAt: '2026-10-21', allDay: true, customerId: 42, customerName: '홍길동', readOnly: true },
      { id: 'google:primary:trip', source: 'google', sourceId: 'trip', calendarId: 'primary', type: 'google_event', title: '출장', startAt: '2026-10-20', endAt: '2026-10-23', allDay: true, writable: false, readOnlyReason: 'recurring' },
      { id: '', title: 'broken' },
    ],
    tasks: [
      { id: 'onefc_todo:7', source: 'onefc_todo', sourceId: '7', title: '서류', dueDate: '2026-10-19', dueTime: '09:00', status: 'open', customerId: 42, customerName: '홍길동' },
      { id: 'google_task:list:t', source: 'google_task', sourceId: 't', title: '장보기', dueDate: null, status: 'open' },
    ],
    fetchedAt: '2026-10-19T00:00:00.000Z',
  };
}

describe('schedule model (웹 /api/schedule/events SSOT)', () => {
  it('normalizes the server response (wrapped or unwrapped) and drops broken rows', () => {
    const unwrapped = normalizeScheduleEvents(serverPayload());
    const wrapped = normalizeScheduleEvents({ success: true, data: serverPayload() });
    expect(wrapped).toEqual(unwrapped);
    expect(unwrapped.events.map((event) => event.id)).toEqual(['google:primary:abc', 'crm:car:1', 'google:primary:trip']);
    expect(unwrapped.google.write.enabled).toBe(true);
    expect(unwrapped.tasks[1]!.dueDate).toBeNull();
    expect(() => normalizeScheduleEvents({ success: true, data: {} })).toThrow(ApiError);
  });

  it('builds month ranges and Sunday-first grids', () => {
    expect(monthRange('2026-10-01')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(shiftMonth('2026-12-01', 1)).toBe('2027-01-01');
    expect(shiftMonth('2026-01-01', -1)).toBe('2025-12-01');
    const grid = monthGrid('2026-10-01');
    expect(grid[0]![0]!.ymd).toBe('2026-09-27');
    expect(grid[0]![4]).toEqual({ ymd: '2026-10-01', day: 1, inMonth: true });
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[grid.length - 1]!.some((cell) => cell.ymd === '2026-10-31')).toBe(true);
  });

  it('buckets events by KST day with exclusive all-day end and multi-day spans', () => {
    const { events, tasks } = normalizeScheduleEvents(serverPayload());
    expect(eventDayRange(events[2]!)).toEqual({ first: '2026-10-20', last: '2026-10-22' });
    expect(eventsOnDay(events, '2026-10-19').map((event) => event.sourceId)).toEqual(['abc']);
    expect(eventsOnDay(events, '2026-10-20').map((event) => event.sourceId)).toEqual(['1', 'trip']);
    expect(eventsOnDay(events, '2026-10-23')).toEqual([]);
    // UTC 로 전날인 시간 일정도 KST 날짜로 묶는다.
    const lateUtc = { ...events[0]!, startAt: '2026-10-18T16:00:00Z', endAt: '2026-10-18T17:00:00Z' };
    expect(eventDayRange(lateUtc)).toEqual({ first: '2026-10-19', last: '2026-10-19' });
    expect(eventTimeLabel(events[0]!)).toBe('14:00 ~ 15:30');
    expect(eventTimeLabel(events[1]!)).toBe('종일');
    expect(tasksOnDay(tasks, '2026-10-19').map((task) => task.sourceId)).toEqual(['7']);
    expect([...daysWithItems({ events, tasks })].sort()).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22']);
  });

  it('counts dated items per day like the per-day list, excluding undated todos', () => {
    const { events, tasks } = normalizeScheduleEvents(serverPayload());
    const counts = countItemsByDay({ events, tasks });
    for (const day of ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']) {
      expect(counts.get(day) ?? 0).toBe(eventsOnDay(events, day).length + tasksOnDay(tasks, day).filter((task) => task.status !== 'completed').length);
    }
    const undated = { ...tasks[0]!, id: 'x', dueDate: null };
    expect(countItemsByDay({ events: [], tasks: [undated] }).size).toBe(0);
    expect(countItemsByDay({ events: [], tasks: [] }).size).toBe(0);
  });

  it('formats the day count badge', () => {
    expect(dayCountLabel(0)).toBe('');
    expect(dayCountLabel(1)).toBe('1');
    expect(dayCountLabel(9)).toBe('9');
    expect(dayCountLabel(10)).toBe('9+');
    expect(dayCountLabel(57)).toBe('9+');
  });

  it('opens linked customers and todos only by server ids', () => {
    const { events, tasks } = normalizeScheduleEvents(serverPayload());
    expect(customerRouteOfEvent(events[1]!)).toEqual({ pathname: '/customers/[customerId]', params: { customerId: '42' } });
    expect(customerRouteOfEvent({ source: 'crm', type: 'customer_alert', customerId: 5 })).toEqual({ pathname: '/customers/[customerId]/consultations', params: { customerId: '5' } });
    expect(customerRouteOfEvent(events[0]!)).toBeNull();
    expect(todoRouteOfTask(tasks[0]!)).toEqual({ pathname: '/todos/[todoId]/edit', params: { todoId: '7', from: 'schedule' } });
    expect(todoRouteOfTask(tasks[1]!)).toBeNull();
    expect(customerRouteOfTask(tasks[0]!)).toEqual({ pathname: '/customers/[customerId]/consultations', params: { customerId: '42' } });
  });

  it('gates writes on server write state and per-event editability', () => {
    const { events } = normalizeScheduleEvents(serverPayload());
    expect(canCreateGoogleEvent(writeOn)).toBe(true);
    expect(canCreateGoogleEvent(writeOff)).toBe(false);
    expect(canEditEvent(events[0]!, writeOn)).toBe(true);
    expect(canEditEvent(events[0]!, writeOff)).toBe(false);
    expect(canEditEvent(events[1]!, writeOn)).toBe(false);
    expect(canEditEvent(events[2]!, writeOn)).toBe(false);
    expect(isOnefcSchedule(events[0]!)).toBe(false);
    expect(readOnlyMessage(events[2]!, writeOn)).toContain('반복 일정');
    expect(readOnlyMessage(events[1]!, writeOn)).toContain('고객');
    expect(readOnlyMessage(events[0]!, writeOff)).toContain('사용할 수 없습니다');
  });

  it('converts events to the edit form and validates like the server', () => {
    const { events } = normalizeScheduleEvents(serverPayload());
    const timed = eventToForm(events[0]!);
    expect(timed).toMatchObject({ calendarId: 'primary', date: '2026-10-19', endDate: '2026-10-19', allDay: false, startTime: '14:00', endTime: '15:30' });
    const allDay = eventToForm(events[2]! as ScheduleEvent);
    expect(allDay).toMatchObject({ date: '2026-10-20', endDate: '2026-10-22', allDay: true });
    expect(formToGoogleInput(allDay)).toMatchObject({ allDay: true, startTime: null, endTime: null, endDate: '2026-10-22' });
    expect(validateEventForm(timed)).toBeNull();
    expect(validateEventForm({ ...timed, title: ' ' })).toContain('제목');
    expect(validateEventForm({ ...timed, calendarId: '' })).toContain('캘린더');
    expect(validateEventForm({ ...timed, endTime: '13:00' })).toContain('종료 시각');
    expect(validateEventForm({ ...timed, startTime: '9:00' })).toContain('시작 시각');
    expect(validateEventForm({ ...timed, endDate: '2026-10-18' })).toContain('종료일');
    expect(validateEventForm({ ...allDay, startTime: 'x' })).toBeNull();
    expect(newScheduleRequestId()).toMatch(/^[0-9a-f]{32}$/);
  });
});

const ONEFC_ID = '11111111-1111-4111-8111-111111111111';

function onefcPayload() {
  return {
    events: [{
      id: `onefc:${ONEFC_ID}`,
      source: 'google',
      sourceId: ONEFC_ID,
      calendarId: null,
      calendarName: 'ONE FC',
      type: 'google_event',
      title: '상담',
      description: '',
      startAt: '2026-10-22T10:00:00+09:00',
      endAt: '2026-10-22T11:00:00+09:00',
      allDay: false,
      writable: true,
      readOnlyReason: '',
      origin: 'onefc',
    }],
    tasks: [{ id: 'onefc_todo:9', source: 'onefc_todo', sourceId: '9', title: '서류', dueDate: '2026-10-22', status: 'open' }],
    google: writeOff,
  };
}

describe('schedule event source label', () => {
  it('CASE1 origin onefc google_event is ONE FC 일정', () => {
    expect(scheduleEventSourceLabel({ type: 'google_event', origin: 'onefc' })).toBe('ONE FC 일정');
  });
  it('CASE2 google_event without origin is Google 일정', () => {
    expect(scheduleEventSourceLabel({ type: 'google_event' })).toBe('Google 일정');
  });
  it('CASE3 customer_alert keeps 알림일', () => {
    expect(scheduleEventSourceLabel({ type: 'customer_alert' })).toBe('알림일');
  });
  it('CASE4 car_expiry keeps 자동차 만기', () => {
    expect(scheduleEventSourceLabel({ type: 'car_expiry' })).toBe('자동차 만기');
  });
  it('CASE5 insurance_age keeps 상령일', () => {
    expect(scheduleEventSourceLabel({ type: 'insurance_age' })).toBe('상령일');
  });
});

describe('ONE FC schedule (insurance #210)', () => {
  it('keeps a local schedule as one event and does not turn it into a todo', () => {
    const result = normalizeScheduleEvents(onefcPayload());
    const event = result.events[0]!;
    expect(event).toMatchObject({ id: `onefc:${ONEFC_ID}`, sourceId: ONEFC_ID, origin: 'onefc', source: 'google', calendarName: 'ONE FC', type: 'google_event' });
    expect(eventsOnDay(result.events, '2026-10-22')).toHaveLength(1);
    expect(tasksOnDay(result.tasks, '2026-10-22')).toHaveLength(1);
    expect(countItemsByDay(result).get('2026-10-22')).toBe(2);
    expect(canEditEvent(event, writeOff)).toBe(true);
    expect(canEditEvent(event, writeOn)).toBe(true);
    expect(scheduleDeletePrompt(event).message).toContain('ONE FC');
    expect(scheduleDeletePrompt({ origin: undefined }).message).toContain('Google');
    expect(onefcScheduleRawId(`onefc:${ONEFC_ID}`)).toBe(ONEFC_ID);
    expect(onefcScheduleRawId(ONEFC_ID)).toBe(ONEFC_ID);
    expect(() => onefcScheduleRawId('onefc:')).toThrow(ApiError);
    expect(() => onefcScheduleRawId('  ')).toThrow(ApiError);
  });
});

describe('schedule api (기존 서버 API만 사용)', () => {
  beforeEach(() => mockedRequest.mockReset());

  it('reads events with the full range and optional refresh', async () => {
    mockedRequest.mockResolvedValue(serverPayload());
    await fetchScheduleEvents('tkn', { from: '2026-10-01', to: '2026-10-31' });
    await fetchScheduleEvents('tkn', { from: '2026-10-01', to: '2026-10-31', refresh: true });
    expect(mockedRequest.mock.calls[0]![0]).toBe('/api/schedule/events?from=2026-10-01&to=2026-10-31&sources=all');
    expect(mockedRequest.mock.calls[1]![0]).toBe('/api/schedule/events?from=2026-10-01&to=2026-10-31&sources=all&refresh=1');
    expect(mockedRequest.mock.calls[0]![1]).toEqual({ token: 'tkn' });
    await expect(fetchScheduleEvents(null, { from: 'a', to: 'b' })).rejects.toMatchObject({ status: 401 });
  });

  it('writes Google events through the existing write endpoints', async () => {
    mockedRequest.mockResolvedValue({ calendars: [{ id: 'primary', name: '내 캘린더', primary: true }] });
    expect(await fetchWritableCalendars('tkn')).toEqual([{ id: 'primary', name: '내 캘린더', primary: true }]);
    const form = { calendarId: 'primary', title: '미팅', description: '', date: '2026-10-19', endDate: '2026-10-19', allDay: false, startTime: '14:00', endTime: '15:00' };
    await createScheduleEvent('tkn', form, 'a'.repeat(32));
    await updateScheduleEvent('tkn', 'abc', form);
    await deleteScheduleEvent('tkn', 'primary', 'abc');
    const calls = mockedRequest.mock.calls.slice(1);
    expect(calls.map(([url, init]) => [url, init?.method])).toEqual([
      ['/api/service-integrations/google/write/events', 'POST'],
      ['/api/service-integrations/google/write/events', 'PATCH'],
      ['/api/service-integrations/google/write/events', 'DELETE'],
    ]);
    expect(JSON.parse(String(calls[0]![1]!.body))).toMatchObject({ calendarId: 'primary', title: '미팅', requestId: 'a'.repeat(32) });
    expect(JSON.parse(String(calls[1]![1]!.body))).toMatchObject({ eventId: 'abc', startTime: '14:00' });
    expect(JSON.parse(String(calls[2]![1]!.body))).toEqual({ calendarId: 'primary', eventId: 'abc' });
  });

  it('creates, updates, and deletes ONE FC schedules without the onefc: prefix', async () => {
    const event = {
      id: `onefc:${ONEFC_ID}`,
      source: 'google',
      sourceId: ONEFC_ID,
      type: 'google_event',
      title: '상담',
      startAt: '2026-10-22T10:00:00+09:00',
      calendarName: 'ONE FC',
      origin: 'onefc',
    };
    const form = { calendarId: '', title: '상담', description: '', date: '2026-10-22', endDate: '2026-10-22', allDay: true, startTime: '09:00', endTime: '10:00' };
    mockedRequest.mockResolvedValueOnce({ success: true, data: { event, duplicate: false } });
    await expect(createOnefcSchedule('tkn', form, 'b'.repeat(32))).resolves.toBe(`onefc:${ONEFC_ID}`);
    mockedRequest.mockResolvedValueOnce({ data: { event, duplicate: true } });
    await expect(createOnefcSchedule('tkn', form, 'b'.repeat(32))).resolves.toBe(`onefc:${ONEFC_ID}`);
    mockedRequest.mockResolvedValue({});
    await updateOnefcSchedule('tkn', `onefc:${ONEFC_ID}`, form);
    await updateOnefcSchedule('tkn', ONEFC_ID, form);
    await deleteOnefcSchedule('tkn', `onefc:${ONEFC_ID}`);
    const calls = mockedRequest.mock.calls;
    expect(calls.slice(0, 2).map(([url, init]) => [url, init?.method])).toEqual([
      ['/api/schedules', 'POST'],
      ['/api/schedules', 'POST'],
    ]);
    expect(JSON.parse(String(calls[0]![1]!.body))).toMatchObject({ title: '상담', allDay: true, requestId: 'b'.repeat(32), calendarId: '' });
    expect(JSON.parse(String(calls[0]![1]!.body))).not.toHaveProperty('eventId');
    expect(calls.slice(2).map(([url, init]) => [url, init?.method])).toEqual([
      [`/api/schedules/${ONEFC_ID}`, 'PATCH'],
      [`/api/schedules/${ONEFC_ID}`, 'PATCH'],
      [`/api/schedules/${ONEFC_ID}`, 'DELETE'],
    ]);
    expect(calls[4]![1]!.body).toBeUndefined();
    await expect(deleteOnefcSchedule('tkn', 'onefc:')).rejects.toMatchObject({ status: 404 });
    expect(mockedRequest).toHaveBeenCalledTimes(5);
  });

  it('keeps the screen native and on the shared API (no WebView, no new tables)', () => {
    const screen = read('ScheduleScreen.tsx');
    const api = read('scheduleApi.ts');
    expect(screen).not.toMatch(/react-native-webview/);
    expect(screen).toContain('scheduleRefreshError');
    expect(api).not.toMatch(/\/api\/native|\/api\/mobile/);
  });
});

describe('schedule refresh error copy', () => {
  it('maps 429 to a cooldown message', () => {
    // 화면 모듈 전체를 import 하지 않고 같은 규칙만 확인한다.
    const screen = read('ScheduleScreen.tsx');
    expect(screen).toMatch(/error\.status === 429\) return SCHEDULE_COPY\.refreshLimited/);
  });
});
