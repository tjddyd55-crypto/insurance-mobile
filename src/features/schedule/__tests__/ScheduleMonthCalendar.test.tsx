import { useState } from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { DesignSystemProvider, getTheme } from '../../../design-system';
import { ScheduleMonthCalendar } from '../ScheduleMonthCalendar';
import { formatDayTitle, normalizeScheduleEvents } from '../scheduleModel';
import { groupMonthItems } from '../scheduleMonthModel';

const data = normalizeScheduleEvents({ events: Array.from({ length: 5 }, (_, id) => ({
  id: String(id), title: `고객 상담 ${id}`, allDay: true, startAt: '2026-11-13', endAt: '2026-11-14',
})), tasks: [] });
const days = groupMonthItems(data, '2026-11-01');

function calendar(month = '2026-11-01', viewportHeight = 700, mode: 'light' | 'dark' = 'light') {
  const onSelect = jest.fn();
  const onOpen = jest.fn();
  function Host() {
    const [selected, setSelected] = useState('2026-11-13');
    return <DesignSystemProvider initialMode={mode}>
      <ScheduleMonthCalendar month={month} selected={selected} today="2026-11-09" viewportHeight={viewportHeight} days={days}
        onSelectDate={(date) => { setSelected(date); onSelect(date); }} onOpenItem={onOpen} />
    </DesignSystemProvider>;
  }
  return { ...render(<Host />), onSelect, onOpen };
}

describe('native month calendar', () => {
  it('selects an empty whole cell without opening an event; selection and today remain distinct', () => {
    const ui = calendar();
    const empty = ui.getByRole('button', { name: '11월 14일 (토), 일정 0건' });
    fireEvent.press(empty);
    expect(ui.onSelect).toHaveBeenCalledWith('2026-11-14');
    expect(ui.getByRole('button', { name: '11월 14일 (토), 일정 0건' }).props.accessibilityState).toEqual({ selected: true });
    expect(ui.getByRole('button', { name: '11월 9일 (월), 오늘, 일정 0건' }).props.accessibilityState).toEqual({ selected: false });
    expect(ui.onOpen).not.toHaveBeenCalled();
  });

  it('shows actual titles and +N; chip presses open the existing item without firing date selection', () => {
    const ui = calendar();
    const cell = within(ui.getByTestId('schedule-day-2026-11-13'));
    expect(cell.getByText('+3')).toBeTruthy();
    expect(cell.queryByText('고객 상담 2')).toBeNull();
    fireEvent.press(cell.getByRole('button', { name: '11월 13일 (금), 고객 상담 0, 상세 보기' }));
    expect(ui.onOpen).toHaveBeenCalledWith(data.events[0], '2026-11-13');
    expect(ui.onSelect).not.toHaveBeenCalled();
  });

  it.each(['light', 'dark'] as const)('uses semantic Sunday/Saturday and today colors in %s mode', (mode) => {
    const ui = calendar('2026-11-01', 700, mode);
    const colors = getTheme(mode).colors;
    expect(StyleSheet.flatten(ui.getByText('일').props.style).color).toBe(colors.danger);
    expect(StyleSheet.flatten(ui.getByText('토').props.style).color).toBe(colors.info);
    const today = within(ui.getByTestId('schedule-day-2026-11-09')).getByText('9');
    expect(StyleSheet.flatten(today.props.style).color).toBe(colors.onPrimary);
  });

  it.each([['2026-11-01', 5], ['2026-08-01', 6]] as const)('keeps readable rows in a short %s calendar (%i weeks)', (month, count) => {
    const ui = calendar(month, 400);
    expect(ui.getAllByTestId('schedule-month-week')).toHaveLength(count);
    const cell = ui.getByTestId(`schedule-day-${month}`);
    expect(StyleSheet.flatten(cell.props.style).minHeight).toBeGreaterThan(getTheme('light').interaction.minimumTouchTarget);
    expect(ui.getByRole('button', { name: new RegExp(`^${formatDayTitle(month).replace(/[()]/g, '\\$&')}, 일정`) })).toBeTruthy();
  });
});
