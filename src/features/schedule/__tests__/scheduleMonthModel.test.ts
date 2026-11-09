import fixture from '../__fixtures__/scheduleDayCountCases.json';
import { countItemsByDay, eventsOnDay, monthGrid, normalizeScheduleEvents, shiftMonth, tasksOnDay } from '../scheduleModel';
import { groupMonthItems, monthDayPreview } from '../scheduleMonthModel';
import type { ScheduleEvent, ScheduleTask } from '../types';

describe('monthly response grouping', () => {
  for (const example of fixture.cases) {
    it(`preserves the existing day/count SSOT: ${example.name}`, () => {
      const data = { events: example.events as unknown as ScheduleEvent[], tasks: example.tasks as unknown as ScheduleTask[] };
      const days = groupMonthItems(data, '2026-10-01');
      const counts = countItemsByDay(data);
      for (const [date, items] of days) {
        expect(items.events).toEqual(eventsOnDay(data.events, date));
        expect(items.tasks).toEqual(tasksOnDay(data.tasks, date).filter((task) => task.status !== 'completed'));
        expect(items.events.length + items.tasks.length).toBe(counts.get(date) ?? 0);
      }
    });
  }

  it('clips long events to the visible grid, retaining exclusive all-day and KST midnight endings', () => {
    const data = normalizeScheduleEvents({ events: [
      { id: 'span', allDay: true, startAt: '2020-01-01', endAt: '2030-01-01' },
      { id: 'all-day', allDay: true, startAt: '2026-11-13', endAt: '2026-11-14' },
      { id: 'midnight', startAt: '2026-11-12T14:00:00Z', endAt: '2026-11-12T15:00:00Z' },
    ], tasks: [] });
    const days = groupMonthItems(data, '2026-11-01');
    expect(days.size).toBe(35);
    expect(days.get('2026-11-12')!.events.map((e) => e.id)).toEqual(['span', 'midnight']);
    expect(days.get('2026-11-13')!.events.map((e) => e.id)).toEqual(['span', 'all-day']);
    expect(days.get('2026-11-14')!.events.map((e) => e.id)).toEqual(['span']);
  });

  it('shows two previews and +N but keeps every item available to the selected-day list', () => {
    const data = normalizeScheduleEvents({ events: Array.from({ length: 6 }, (_, id) => ({
      id: String(id), title: `일정 ${id}`, allDay: true, startAt: '2026-11-13', endAt: '2026-11-14',
    })), tasks: [{ id: 'task', title: '할 일', dueDate: '2026-11-13' }] });
    const original = JSON.stringify(data);
    const day = groupMonthItems(data, '2026-11-01').get('2026-11-13');
    expect(monthDayPreview(day)).toMatchObject({ more: 5, total: 7 });
    expect(monthDayPreview(day).items).toHaveLength(2);
    expect(day!.events).toHaveLength(6);
    expect(day!.tasks).toHaveLength(1);
    expect(JSON.stringify(data)).toBe(original);
    expect(monthDayPreview(undefined)).toEqual({ items: [], more: 0, total: 0 });
  });

  it('uses five/six Sunday-first weeks and supports previous/next month across a year boundary', () => {
    expect(monthGrid('2026-11-01')).toHaveLength(5);
    expect(monthGrid('2026-08-01')).toHaveLength(6);
    expect(shiftMonth('2026-12-01', 1)).toBe('2027-01-01');
    expect(shiftMonth('2027-01-01', -1)).toBe('2026-12-01');
    expect(groupMonthItems({ events: [], tasks: [] }, '2026-08-01').size).toBe(42);
  });
});
