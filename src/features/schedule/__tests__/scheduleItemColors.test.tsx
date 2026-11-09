import { render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { DesignSystemProvider } from '../../../design-system';
import { ScheduleMonthCalendar } from '../ScheduleMonthCalendar';
import { ScheduleItemBadge } from '../ScheduleItemBadge';
import { SCHEDULE_ITEM_COLORS, scheduleItemAppearance, scheduleItemColorKey } from '../scheduleItemColors';
import { normalizeScheduleEvents } from '../scheduleModel';

it('classifies ONE FC origin before its shared Google API source; tasks never inherit event green', () => {
  expect(scheduleItemColorKey({ source: 'google', origin: 'onefc' })).toBe('onefc_event');
  expect(scheduleItemColorKey({ source: 'onefc_todo' })).toBe('onefc_todo');
  expect(scheduleItemAppearance({ source: 'onefc_todo' }).background).not.toBe(scheduleItemAppearance({ source: 'google', origin: 'onefc' }).background);
  expect(scheduleItemAppearance({ source: 'google' }).background).not.toBe(scheduleItemAppearance({ source: 'onefc_todo' }).background);
});

it.each(['light', 'dark'] as const)('fades and strikes only completed tasks in %s mode', (mode) => {
  for (const source of ['onefc_todo', 'google_task']) {
    expect(scheduleItemAppearance({ source, status: 'completed' }, mode)).toMatchObject({ opacity: 0.5, textDecorationLine: 'line-through' });
    expect(scheduleItemAppearance({ source, status: 'open' }, mode).opacity).toBe(1);
  }
  expect(scheduleItemAppearance({ source: 'google', origin: 'onefc', status: 'completed' }, mode).opacity).toBe(1);
});

it('renders distinct month chips and a completed source badge without changing press targets', () => {
  const data = normalizeScheduleEvents({ events: [{ id: 'e', source: 'google', origin: 'onefc', title: '일정', allDay: true, startAt: '2026-11-13', endAt: '2026-11-14' }], tasks: [{ id: 't', source: 'onefc_todo', title: '할 일', dueDate: '2026-11-13' }] });
  const open = jest.fn();
  const ui = render(<DesignSystemProvider>
    <ScheduleMonthCalendar month="2026-11-01" selected="2026-11-13" today="2026-11-09" viewportHeight={700}
      days={new Map([['2026-11-13', { events: data.events, tasks: data.tasks }]])} onSelectDate={jest.fn()} onOpenItem={open} />
    <ScheduleItemBadge item={{ source: 'onefc_todo', status: 'completed' }} label="완료된 할 일" />
  </DesignSystemProvider>);
  const cell = within(ui.getByTestId('schedule-day-2026-11-13'));
  const style = (title: string) => StyleSheet.flatten(cell.getByText(title).props.style);
  expect(style('일정').color).toBe(SCHEDULE_ITEM_COLORS.onefc_event.light.foreground);
  expect(style('할 일').color).toBe(SCHEDULE_ITEM_COLORS.onefc_todo.light.foreground);
  expect(StyleSheet.flatten(ui.getByText('완료된 할 일').props.style).textDecorationLine).toBe('line-through');
});
