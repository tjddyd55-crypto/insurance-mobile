import { apiRequest } from '../../../api/client';
import { createOnefcSchedule, updateOnefcSchedule } from '../scheduleApi';
import {
  applyScheduleDateTime,
  eventToForm,
  formToGoogleInput,
  scheduleEventSaveForm,
  sensibleEndTime,
  validateEventForm,
  withScheduleEndTime,
  withScheduleStartTime,
} from '../scheduleModel';
import { todoEditorDateTimePayload, type TodoFormDraft } from '../../todos/todoFormSession';
import type { ScheduleEvent, ScheduleEventForm } from '../types';

jest.mock('../../../api/client', () => {
  const actual = jest.requireActual('../../../api/client');
  return { ...actual, apiRequest: jest.fn() };
});

const mockedRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

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
  it('uses one same-day end rule for sensibleEndTime, and applyScheduleDateTime (widget uses the same schedule form)', () => {
    for (const [start, end] of END_FIXTURE) {
      expect(sensibleEndTime(start)).toBe(end);
      expect(applyScheduleDateTime(ALL_DAY, 'start', { date: '2026-10-24', time: start })).toMatchObject({
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
  });
});

function crossDayEvent(start: string, end: string, endDay: string): ScheduleEvent {
  return {
    id: 'onefc:late',
    source: 'google',
    sourceId: 'late',
    calendarId: null,
    calendarName: 'ONE FC',
    type: 'google_event',
    title: '늦은 상담',
    description: '원래 설명',
    startAt: `2026-10-24T${start}:00+09:00`,
    endAt: `${endDay}T${end}:00+09:00`,
    allDay: false,
    customerId: null,
    customerName: '',
    location: '',
    writable: true,
    readOnlyReason: '',
    origin: 'onefc',
  };
}

function newSameDay(startTime: string, endTime = '10:00'): ScheduleEventForm {
  return {
    calendarId: '',
    title: '새 일정',
    description: '',
    date: '2026-10-24',
    endDate: '2026-10-24',
    allDay: false,
    startTime,
    endTime,
  };
}

async function expectSavedPayload(form: ScheduleEventForm, expected: Record<string, unknown>, mode: 'create' | 'edit') {
  const saved = scheduleEventSaveForm(form, form.date);
  expect(validateEventForm(saved, { calendarRequired: false })).toBeNull();
  const payload = formToGoogleInput(saved);
  expect(payload).toMatchObject(expected);
  mockedRequest.mockResolvedValueOnce({
    success: true,
    data: { event: { id: 'onefc:late', startAt: '2026-10-24T23:30:00+09:00' }, duplicate: false },
  });
  if (mode === 'edit') {
    await updateOnefcSchedule('tkn', 'onefc:late', saved);
  } else {
    await createOnefcSchedule('tkn', saved, 'c'.repeat(32));
  }
  const body = JSON.parse(String(mockedRequest.mock.calls.at(-1)?.[1]?.body)) as Record<string, unknown>;
  expect(body).toMatchObject(expected);
  expect(body).toMatchObject({
    date: payload.date,
    endDate: payload.endDate,
    allDay: payload.allDay,
    startTime: payload.startTime,
    endTime: payload.endTime,
    title: payload.title,
    description: payload.description,
  });
}

describe('cross-day schedule save payload', () => {
  beforeEach(() => mockedRequest.mockReset());

  it('A keeps 10/24 23:30 → 10/25 00:30 when only the title changes', async () => {
    const form = { ...eventToForm(crossDayEvent('23:30', '00:30', '2026-10-25')), title: '제목만 수정' };
    await expectSavedPayload(form, {
      title: '제목만 수정',
      description: '원래 설명',
      date: '2026-10-24',
      endDate: '2026-10-25',
      allDay: false,
      startTime: '23:30',
      endTime: '00:30',
    }, 'edit');
  });

  it('B keeps the same range when only the description changes', async () => {
    const form = { ...eventToForm(crossDayEvent('23:30', '00:30', '2026-10-25')), description: '설명만 수정' };
    await expectSavedPayload(form, {
      title: '늦은 상담',
      description: '설명만 수정',
      date: '2026-10-24',
      endDate: '2026-10-25',
      startTime: '23:30',
      endTime: '00:30',
    }, 'edit');
  });

  it('C sets a new same-day 23:30 event to 23:59', async () => {
    await expectSavedPayload(newSameDay('23:30'), {
      date: '2026-10-24',
      endDate: '2026-10-24',
      startTime: '23:30',
      endTime: '23:59',
    }, 'create');
  });

  it('D sets a new same-day 14:00 event to 15:00', async () => {
    await expectSavedPayload(newSameDay('14:00'), {
      date: '2026-10-24',
      endDate: '2026-10-24',
      startTime: '14:00',
      endTime: '15:00',
    }, 'create');
  });

  it('E keeps 22:30 → next day 00:30 when only the title changes', async () => {
    const form = { ...eventToForm(crossDayEvent('22:30', '00:30', '2026-10-25')), title: '다른 제목' };
    await expectSavedPayload(form, {
      title: '다른 제목',
      date: '2026-10-24',
      endDate: '2026-10-25',
      startTime: '22:30',
      endTime: '00:30',
    }, 'edit');
  });

  it('F does not change date or time when an opened event is saved as-is', async () => {
    const opened = eventToForm(crossDayEvent('23:30', '00:30', '2026-10-25'));
    await expectSavedPayload(opened, {
      title: '늦은 상담',
      description: '원래 설명',
      date: '2026-10-24',
      endDate: '2026-10-25',
      startTime: '23:30',
      endTime: '00:30',
    }, 'edit');
  });

  it('corrects a same-day edit and keeps a cross-day clock when the user changes a time', async () => {
    const cross = eventToForm(crossDayEvent('23:30', '00:30', '2026-10-25'));
    const movedStart: ScheduleEventForm = { ...cross, ...withScheduleStartTime(cross, '22:00') };
    expect(movedStart).toMatchObject({ date: '2026-10-24', endDate: '2026-10-25', startTime: '22:00', endTime: '00:30' });
    await expectSavedPayload(movedStart, { startTime: '22:00', endTime: '00:30', endDate: '2026-10-25' }, 'edit');

    const sameDay = { ...newSameDay('14:00', '15:30'), title: '같은 날' };
    expect(withScheduleStartTime(sameDay, '23:00')).toMatchObject({ endDate: '2026-10-24', startTime: '23:00', endTime: '23:59' });
    await expectSavedPayload(
      { ...sameDay, date: '2026-10-24', endDate: '2026-10-24', startTime: '16:00', endTime: '15:00' },
      { startTime: '16:00', endTime: '17:00', endDate: '2026-10-24' },
      'edit',
    );
  });
});
