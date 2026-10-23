import fixture from '../__fixtures__/scheduleDayCountCases.json';
import { countItemsByDay, dayCountLabel } from '../scheduleModel';
import type { ScheduleEvent, ScheduleTask } from '../types';

describe('countItemsByDay (웹과 같은 공통 fixture)', () => {
  for (const c of fixture.cases) {
    it(c.name, () => {
      const counts = countItemsByDay({ events: c.events as unknown as ScheduleEvent[], tasks: c.tasks as unknown as ScheduleTask[] });
      expect(Object.fromEntries(counts)).toEqual(c.expect);
      for (const [date, label] of Object.entries(c.label)) expect(dayCountLabel(counts.get(date) ?? 0)).toBe(label);
    });
  }
});
