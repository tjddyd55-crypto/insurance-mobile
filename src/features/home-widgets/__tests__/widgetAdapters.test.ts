import { normalizeScheduleEvents } from '../../schedule/scheduleModel';
import { scheduleLinkTarget } from '../../schedule/scheduleLinkParams';
import { normalizeTodo } from '../../todos/todoModel';
import { seedTodoCreateForm } from '../../todos/consultationTodoCreate';
import { buildScheduleDays, widgetGoogleNotice } from '../adapters/scheduleWidgetAdapter';
import { buildTodoDays } from '../adapters/todoWidgetAdapter';
import { widgetWindow } from '../adapters/widgetWindow';
import { buildWidgetDeepLink, consumePendingWidgetHref, stashPendingWidgetHref, validWidgetDate, widgetReturnHref } from '../engine/widgetDeepLink';

const google = { connected: true, status: 'connected', connectAllowed: true, configured: true, write: { enabled: true, calendarWritable: true, tasksWritable: true, needsWriteConsent: false }, tasks: { status: 'connected', needsReconsent: false } };

function schedule() {
  return normalizeScheduleEvents({
    from: '2026-09-01',
    to: '2026-12-31',
    google,
    events: [
      { id: 'g:late', source: 'google', sourceId: 'late', type: 'google_event', title: '내부 미팅', description: '민감한 메모', location: '강남', startAt: '2026-10-21T17:30:00+09:00', endAt: '2026-10-21T18:00:00+09:00', allDay: false, customerName: '홍길동' },
      { id: 'g:early', source: 'google', sourceId: 'early', type: 'google_event', title: '김철수 상담', startAt: '2026-10-21T09:30:00+09:00', endAt: '2026-10-21T10:00:00+09:00', allDay: false },
      { id: 'g:allday', source: 'google', sourceId: 'allday', type: 'google_event', title: '워크숍', startAt: '2026-10-21', endAt: '2026-10-23', allDay: true },
      { id: 'g:recurring_20261028', source: 'google', sourceId: 'r', type: 'google_event', title: '주간 회의', startAt: '2026-10-28T10:00:00+09:00', endAt: '2026-10-28T11:00:00+09:00', allDay: false },
      // KST 자정 경계: UTC 로는 10/21 15:30 이지만 KST 10/22 00:30
      { id: 'g:midnight', source: 'google', sourceId: 'm', type: 'google_event', title: '심야', startAt: '2026-10-21T15:30:00Z', endAt: '2026-10-21T16:00:00Z', allDay: false },
    ],
    tasks: [
      { id: 'onefc_todo:7', source: 'onefc_todo', sourceId: '7', title: '서류 확인', notes: '주민번호 123456', dueDate: '2026-10-21', dueTime: '14:00', status: 'open', customerId: 3, customerName: '홍길동' },
      { id: 'onefc_todo:8', source: 'onefc_todo', sourceId: '8', title: '날짜 없음', dueDate: null, status: 'open' },
      { id: 'google_task:l:t', source: 'google_task', sourceId: 't', title: 'G 할 일', dueDate: '2026-10-21', status: 'completed' },
      { id: 'google_task:l:u', source: 'google_task', sourceId: 'u', title: 'G 날짜 없음', dueDate: null, status: 'open' },
    ],
  });
}

function todo(id: string, dueDate: string | null, extra: Record<string, unknown> = {}) {
  return normalizeTodo({ id, title: `할 일 ${id}`, description: `상세 ${id} 010-1234-5678`, dueDate, status: 'pending', createdAt: `2026-10-0${id}T00:00:00Z`, ...extra });
}

describe('widget adapters', () => {
  it('uses one window: previous month ~ +2 months', () => {
    expect(widgetWindow('2026-10-21')).toEqual({ from: '2026-09-01', to: '2026-12-31' });
    expect(widgetWindow('2026-01-05')).toEqual({ from: '2025-12-01', to: '2026-03-31' });
  });

  it('schedule days follow the app selectors (all-day first, time order, then dated tasks) and exclude undated tasks', () => {
    const days = buildScheduleDays(schedule(), 'onefc', '2026-09-01', '2026-12-31');
    const oct21 = days.find((day) => day.date === '2026-10-21')!;
    expect(oct21.items.map((item) => item.title)).toEqual(['워크숍', '김철수 상담', '내부 미팅', 'G 할 일', '서류 확인']);
    expect(oct21.items[0]!.time).toBe('종일');
    expect(oct21.items[1]!.time).toBe('09:30 ~ 10:00');
    expect(oct21.items[3]!.done).toBe(true);
    const all = days.flatMap((day) => day.items.map((item) => item.title));
    expect(all).not.toContain('날짜 없음');
    expect(all).not.toContain('G 날짜 없음');
    // 여러 날 종일 일정은 걸친 날마다, 반복 일정은 서버가 펼친 인스턴스만
    expect(days.find((day) => day.date === '2026-10-22')!.items.map((item) => item.title)).toEqual(['워크숍', '심야']);
    expect(days.find((day) => day.date === '2026-10-28')!.items[0]!.title).toBe('주간 회의');
  });

  it('keeps only minimal fields (no notes, description, customer names, location)', () => {
    const json = JSON.stringify(buildScheduleDays(schedule(), 'onefc', '2026-09-01', '2026-12-31'));
    expect(json).not.toMatch(/민감한 메모|주민번호|홍길동|강남/);
    const todoJson = JSON.stringify(buildTodoDays([todo('1', '2026-10-21')], 'onefc', '2026-09-01', '2026-12-31'));
    expect(todoJson).not.toMatch(/010-1234|상세/);
  });

  it('links: ONE FC todo → todo edit, event → schedule date + event', () => {
    const oct21 = buildScheduleDays(schedule(), 'onefc', '2026-09-01', '2026-12-31').find((day) => day.date === '2026-10-21')!;
    expect(oct21.items.find((item) => item.title === '서류 확인')!.link).toBe('onefc://todos/7/edit?src=widget&wt=todo');
    expect(oct21.items.find((item) => item.title === '김철수 상담')!.link).toBe('onefc://schedule?date=2026-10-21&event=g%3Aearly&src=widget&wt=schedule');
  });

  it('todo days: dated only, canceled excluded, app todo sort (recent write first)', () => {
    const days = buildTodoDays(
      [todo('1', '2026-10-21'), todo('2', '2026-10-21', { status: 'completed', updatedAt: '2026-10-09T00:00:00Z' }), todo('3', null), todo('4', '2026-10-21', { status: 'canceled' }), todo('5', '2026-10-22')],
      'onefc',
      '2026-09-01',
      '2026-12-31',
    );
    expect(days.map((day) => day.date)).toEqual(['2026-10-21', '2026-10-22']);
    expect(days[0]!.items.map((item) => [item.id, item.completed])).toEqual([['2', true], ['1', false]]);
  });

  it('google notice only when sync is broken (not for never-connected users)', () => {
    expect(widgetGoogleNotice(google)).toBeNull();
    expect(widgetGoogleNotice({ ...google, status: 'needs_reauth' })).toBe('Google 일정 동기화 필요');
    expect(widgetGoogleNotice({ ...google, status: 'error' })).toBe('Google 일정 동기화 필요');
    expect(widgetGoogleNotice({ ...google, connected: false, status: 'disconnected' })).toBeNull();
  });
});

describe('home widget deep links', () => {
  it('builds the route contract on the given scheme via one builder', () => {
    expect(buildWidgetDeepLink('onefc', 'schedule', 'create', { date: '2026-10-21' })).toBe('onefc://schedule?date=2026-10-21&create=1&src=widget&wt=schedule');
    expect(buildWidgetDeepLink('onefc', 'todo', 'create', { date: '2026-10-21' })).toBe('onefc://todos/new?dueDate=2026-10-21&src=widget&wt=todo');
    expect(buildWidgetDeepLink('onefc-dev', 'todo', 'edit', { id: '12' })).toBe('onefc-dev://todos/12/edit?src=widget&wt=todo');
    expect(buildWidgetDeepLink('onefc', 'schedule', 'open', { date: 'bad' })).toBe('onefc://schedule?src=widget&wt=schedule');
    expect(buildWidgetDeepLink('onefc', 'claims', 'open')).toBeNull();
    expect(buildWidgetDeepLink('onefc', 'todo', 'edit', {})).toBeNull();
    expect(() => buildWidgetDeepLink('ONE FC', 'schedule', 'open')).toThrow();
  });

  it('timezone boundary: adapter window uses the KST day', () => {
    expect(widgetWindow('2026-12-01')).toEqual({ from: '2026-11-01', to: '2027-02-28' });
  });

  it('validates dates and schedule params', () => {
    expect(validWidgetDate('2026-02-30')).toBeUndefined();
    expect(validWidgetDate(['2026-10-01', '2026-10-21'])).toBe('2026-10-21');
    expect(scheduleLinkTarget({ date: '2026-10-21', event: 'g:1', create: '1', _w: '9' })).toEqual({ date: '2026-10-21', itemId: 'g:1', create: true, nonce: '9' });
    expect(scheduleLinkTarget({ event: 'g:1', create: '1' })).toEqual({ date: undefined, itemId: null, create: false, nonce: '' });
  });

  it('returns to the widget target after login (once)', () => {
    expect(widgetReturnHref('/schedule', { date: '2026-10-21', src: 'widget', token: 'x' })).toBe('/schedule?date=2026-10-21&src=widget');
    expect(widgetReturnHref('/customers/1', { src: 'widget' })).toBeNull();
    expect(widgetReturnHref('/schedule', { date: '2026-10-21' })).toBeNull();
    stashPendingWidgetHref('/todos/new?dueDate=2026-10-22&src=widget');
    expect(consumePendingWidgetHref()).toBe('/todos/new?dueDate=2026-10-22&src=widget');
    expect(consumePendingWidgetHref()).toBeNull();
    stashPendingWidgetHref('https://evil.example');
    expect(consumePendingWidgetHref()).toBeNull();
  });

  it('todo create is prefilled with the widget date only when valid', () => {
    expect(seedTodoCreateForm(undefined, '2026-10-23').draft.dueDate).toBe('2026-10-23');
    expect(seedTodoCreateForm(undefined, 'bad').draft.dueDate).toBe('');
    expect(seedTodoCreateForm().draft.dueDate).toBe('');
  });
});
