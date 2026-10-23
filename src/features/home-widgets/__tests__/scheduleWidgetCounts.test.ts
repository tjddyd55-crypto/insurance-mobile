import fixture from '../../schedule/__fixtures__/scheduleDayCountCases.json';
import { countItemsByDay } from '../../schedule/scheduleModel';
import type { ScheduleEvent, ScheduleEventsResult, ScheduleTask } from '../../schedule/types';
import { scheduleWidgetPayload } from '../adapters/scheduleWidgetAdapter';

describe('schedule widget calendarCounts = app/web count rule (shared fixture)', () => {
  for (const c of fixture.cases) {
    it(c.name, () => {
      const result = { events: c.events as unknown as ScheduleEvent[], tasks: c.tasks as unknown as ScheduleTask[], google: { connected: false } } as unknown as ScheduleEventsResult;
      const payload = scheduleWidgetPayload(result, 'onefc-dev', '2026-10-15');
      expect(payload.calendarCounts).toEqual(c.expect);
      expect(payload.calendarCounts).toEqual(Object.fromEntries(countItemsByDay(result)));
      // 칸에 그릴 항목 수와 합계가 같다(제목 + "+N" = count).
      // 칸 제목(완료 제외) + "+N" = count. 아래 목록은 완료도 보여 줄 수 있다.
      for (const day of payload.events) expect(day.items.filter((item) => !item.done).length).toBe(payload.calendarCounts[day.date] ?? 0);
    });
  }
});
