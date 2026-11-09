import { addDaysYmd, eventDayRange, eventsOnDay, monthGrid, tasksOnDay } from './scheduleModel';
import type { ScheduleEvent, ScheduleEventsResult, ScheduleTask } from './types';

export type ScheduleDayItems = { events: ScheduleEvent[]; tasks: ScheduleTask[] };
export type ScheduleMonthItem = ScheduleEvent | ScheduleTask;

/** Group the existing monthly response once; cells never fetch their own data.
 * KST / exclusive end dates and list order remain owned by scheduleModel.
 */
export function groupMonthItems(
  data: Pick<ScheduleEventsResult, 'events' | 'tasks'>,
  month: string,
): Map<string, ScheduleDayItems> {
  const cells = monthGrid(month).flat();
  const first = cells[0]!.ymd;
  const last = cells[cells.length - 1]!.ymd;
  const days = new Map(cells.map(({ ymd }) => [ymd, { events: [] as ScheduleEvent[], tasks: [] as ScheduleTask[] }]));
  for (const event of data.events) {
    const range = eventDayRange(event);
    const start = range.first < first ? first : range.first;
    const end = range.last > last ? last : range.last;
    for (let date = start; date <= end; date = addDaysYmd(date, 1)) days.get(date)?.events.push(event);
  }
  for (const task of data.tasks) {
    if (task.dueDate && task.status !== 'completed') days.get(task.dueDate)?.tasks.push(task);
  }
  for (const [date, items] of days) {
    items.events = eventsOnDay(items.events, date);
    items.tasks = tasksOnDay(items.tasks, date);
  }
  return days;
}

export function monthDayPreview(items: ScheduleDayItems | undefined) {
  const all: ScheduleMonthItem[] = [...(items?.events ?? []), ...(items?.tasks ?? [])];
  return { items: all.slice(0, 2), more: Math.max(0, all.length - 2), total: all.length };
}
