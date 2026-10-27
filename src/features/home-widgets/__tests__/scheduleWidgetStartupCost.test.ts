import { addDaysYmd, eventDayRange, eventsOnDay, seoulHm, seoulYmd, tasksOnDay } from '../../schedule/scheduleModel';
import type { ScheduleEvent, ScheduleEventsResult, ScheduleTask } from '../../schedule/types';
import { buildScheduleDays, scheduleWidgetPayload } from '../adapters/scheduleWidgetAdapter';
import { widgetWindow } from '../adapters/widgetWindow';

/**
 * 앱 시작(로그인 위젯 갱신) 때 JS 스레드에서 도는 일정 위젯 payload 계산.
 * 예전: 날짜마다 전체 일정의 범위를 다시 계산 + 호출마다 Intl.DateTimeFormat 생성(Hermes 에서 매우 비쌈)
 * → 일정이 많으면 수 초간 JS 스레드 점유 → 첫 메뉴 탭이 그만큼 늦게 처리.
 */
function event(i: number): ScheduleEvent {
  const day = addDaysYmd('2026-09-01', i % 110);
  const allDay = i % 3 === 0;
  const hour = String(9 + (i % 8)).padStart(2, '0');
  return {
    id: `e${i}`, source: 'crm', sourceId: String(i), calendarId: null, calendarName: '', type: 'customer_alert',
    title: `일정 ${i}`, description: '', allDay,
    startAt: allDay ? day : `${day}T${hour}:00:00+09:00`,
    endAt: allDay ? addDaysYmd(day, 1 + (i % 4 === 0 ? 2 : 0)) : `${day}T${hour}:30:00+09:00`,
    customerId: null, customerName: '', location: '', writable: false, readOnlyReason: '',
  };
}
const events = Array.from({ length: 400 }, (_, i) => event(i));
const tasks = Array.from({ length: 60 }, (_, i) => ({ id: `t${i}`, source: 'onefc_todo', sourceId: String(i), title: `할 일 ${i}`, notes: '', dueDate: addDaysYmd('2026-09-05', i), dueTime: i % 2 ? '10:00' : null, status: i % 5 ? 'open' : 'completed', customerId: null })) as unknown as ScheduleTask[];
const result = { events, tasks, google: { connected: false } } as unknown as ScheduleEventsResult;

/** 수정 전 알고리즘(날짜마다 전체 일정 eventsOnDay). 결과 동일성 비교용. */
function legacyDates(from: string, to: string): string[] {
  const dates = new Set<string>();
  for (const e of events) {
    const r = eventDayRange(e);
    for (let d = r.first < from ? from : r.first, g = 0; d <= r.last && d <= to && g < 400; d = addDaysYmd(d, 1), g += 1) dates.add(d);
  }
  for (const t of tasks) if (t.dueDate && t.dueDate >= from && t.dueDate <= to) dates.add(t.dueDate);
  return [...dates].sort();
}

describe('schedule widget payload startup cost', () => {
  const range = widgetWindow('2026-10-15');

  it('same days/items/order as the per-day eventsOnDay selector', () => {
    const days = buildScheduleDays(result, 'onefc-dev', range.from, range.to);
    const expected = legacyDates(range.from, range.to)
      .map((date) => ({ date, ids: [...eventsOnDay(events, date).map((e) => e.id), ...tasksOnDay(tasks, date).map((t) => t.id)] }))
      .filter((day) => day.ids.length);
    expect(days.map((day) => ({ date: day.date, ids: day.items.map((item) => item.id) }))).toEqual(expected);
  });

  it('does not construct Intl.DateTimeFormat per event/day (reuses one formatter)', () => {
    seoulYmd(new Date());
    seoulHm(new Date());
    const spy = jest.spyOn(Intl, 'DateTimeFormat');
    scheduleWidgetPayload(result, 'onefc-dev', '2026-10-15');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('seoulYmd/seoulHm output unchanged', () => {
    expect(seoulYmd(new Date('2026-10-26T15:30:00Z'))).toBe('2026-10-27');
    expect(seoulYmd(new Date('2026-10-26T14:59:59Z'))).toBe('2026-10-26');
    expect(seoulHm(new Date('2026-10-26T15:05:00Z'))).toBe('00:05');
  });
});
