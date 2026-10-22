import { applyScheduleDateTime, eventToForm, sensibleEndTime, withScheduleEndTime, withScheduleStartTime } from '../scheduleModel';
import { widgetQuickScheduleForm, widgetQuickTodoPayload } from '../widgetQuickAddModel';
import { todoEditorDateTimePayload, type TodoFormDraft } from '../../todos/todoFormSession';
import type { ScheduleEvent } from '../types';

/**
 * Web/App parity fixture.
 * EVENT 2026-10-24 23:30 → web / app / widget 23:30–23:59, end date stays 2026-10-24.
 * TODO EDIT 2026-10-25 dueTime 14:00, title change → web / app payload dueTime 14:00.
 * Opening a saved cross-day event does not rewrite it.
 */
const END_FIXTURE = [
  ['22:30', '23:30'],
  ['23:00', '23:59'],
  ['23:30', '23:59'],
  ['23:59', '23:59'],
] as const;

const ALL_DAY = { date: '2026-10-24', endDate: '2026-10-24', allDay: true, startTime: '09:00', endTime: '10:00' };

describe('schedule and todo date-time parity', () => {
  it('uses one same-day end rule for sensibleEndTime, applyScheduleDateTime, and widget quick add', () => {
    for (const [start, end] of END_FIXTURE) {
      expect(sensibleEndTime(start)).toBe(end);
      expect(applyScheduleDateTime(ALL_DAY, 'start', { date: '2026-10-24', time: start })).toMatchObject({
        date: '2026-10-24',
        endDate: '2026-10-24',
        allDay: false,
        startTime: start,
        endTime: end,
      });
      expect(widgetQuickScheduleForm({
        title: '상담',
        date: '2026-10-24',
        time: start,
        customerId: null,
        customerName: '',
      })).toMatchObject({
        date: '2026-10-24',
        endDate: '2026-10-24',
        allDay: false,
        startTime: start,
        endTime: end,
      });
    }
  });

  it('corrects a start or end that is not after the other without moving the end date', () => {
    const timed = { date: '2026-10-24', endDate: '2026-10-24', allDay: false, startTime: '14:00', endTime: '15:30' };
    expect(withScheduleStartTime(timed, '23:30')).toMatchObject({ allDay: false, startTime: '23:30', endTime: '23:59' });
    expect(applyScheduleDateTime(timed, 'start', { date: '2026-10-24', time: '23:30' })).toMatchObject({
      endDate: '2026-10-24',
      startTime: '23:30',
      endTime: '23:59',
    });
    expect(applyScheduleDateTime(timed, 'end', { date: '2026-10-24', time: '14:00' })).toMatchObject({
      endDate: '2026-10-24',
      startTime: '14:00',
      endTime: '15:00',
    });
    expect(withScheduleEndTime({ ...timed, startTime: '23:30', endTime: '23:59' }, '23:00')).toMatchObject({
      startTime: '23:30',
      endTime: '23:59',
    });
  });

  it('keeps a saved cross-day event unchanged when it is only opened', () => {
    const event: ScheduleEvent = {
      id: 'onefc:late',
      source: 'google',
      sourceId: 'late',
      calendarId: null,
      calendarName: 'ONE FC',
      type: 'google_event',
      title: '늦은 상담',
      description: '',
      startAt: '2026-10-24T23:30:00+09:00',
      endAt: '2026-10-25T00:30:00+09:00',
      allDay: false,
      customerId: null,
      customerName: '',
      location: '',
      writable: true,
      readOnlyReason: '',
      origin: 'onefc',
    };
    expect(eventToForm(event)).toMatchObject({
      date: '2026-10-24',
      endDate: '2026-10-25',
      allDay: false,
      startTime: '23:30',
      endTime: '00:30',
    });
  });

  it('keeps an existing todo dueTime on edit, and sends null for a cleared date or a new todo', () => {
    const existing: TodoFormDraft = {
      description: '서류',
      dueDate: '2026-10-25',
      dueTime: '14:00',
      relatedCustomerId: '9',
      relatedCustomerName: '김고객',
    };
    expect(todoEditorDateTimePayload({ ...existing, description: '서류 수정' }, 'edit')).toEqual({
      dueDate: '2026-10-25',
      dueTime: '14:00',
    });
    expect(todoEditorDateTimePayload({ ...existing, relatedCustomerId: '3', relatedCustomerName: '박고객' }, 'edit')).toEqual({
      dueDate: '2026-10-25',
      dueTime: '14:00',
    });
    expect(todoEditorDateTimePayload({ ...existing, dueDate: '2026-10-26' }, 'edit')).toEqual({
      dueDate: '2026-10-26',
      dueTime: '14:00',
    });
    expect(todoEditorDateTimePayload({ ...existing, dueDate: '' }, 'edit')).toEqual({ dueDate: null, dueTime: null });
    expect(todoEditorDateTimePayload({ ...existing, dueDate: '2026-10-25', dueTime: '14:00' }, 'create')).toEqual({
      dueDate: '2026-10-25',
      dueTime: null,
    });
    expect(widgetQuickTodoPayload({
      title: '서류',
      date: '2026-10-25',
      time: '14:00',
      customerId: null,
      customerName: '',
    }).dueTime).toBeNull();
  });
});
