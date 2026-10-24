/** 1.0.5 출시 게이트: PC Production 일정/할 일 규칙과 같은지 (cases 1–12). */
import { apiRequest } from '../../../api/client';
import { createOnefcSchedule, deleteOnefcSchedule, updateOnefcSchedule } from '../scheduleApi';
import { emptyEventForm, eventToForm, formToGoogleInput, seoulYmd, toggleScheduleTime, withScheduleStartTime } from '../scheduleModel';
import { createTodo, deleteTodo, updateTodo } from '../../todos/todosApi';
import { buildTodoCreatePayload, todoEditorDateTimePayload, todoFormDraftFromRecord } from '../../todos/todoFormSession';
import type { ScheduleEvent } from '../types';

jest.mock('../../../api/client', () => ({ ...jest.requireActual('../../../api/client'), apiRequest: jest.fn() }));
const req = apiRequest as jest.MockedFunction<typeof apiRequest>;
const body = (i = 0) => JSON.parse(String(req.mock.calls[i][1]?.body ?? '{}'));
const fs = jest.requireActual<{ readFileSync: (f: string, e: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...p: string[]) => string }>('path');
declare const __dirname: string;
const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');

beforeEach(() => req.mockReset());

describe('[일정] 1–6', () => {
  it('1. 오늘 종일 일정 생성 → ONE FC POST /api/schedules, allDay, 시각 null', async () => {
    req.mockResolvedValueOnce({ data: { event: { id: 'onefc:1', startAt: '2026-11-02' } } });
    const today = seoulYmd();
    await createOnefcSchedule('t', { ...emptyEventForm(today), title: '오늘' }, 'r1');
    expect(req.mock.calls[0][0]).toBe('/api/schedules');
    expect(body()).toMatchObject({ date: today, endDate: today, allDay: true, startTime: null, endTime: null, requestId: 'r1' });
  });
  it('2. 미래 날짜 종일 일정은 고른 날짜가 기본값', () => {
    expect(formToGoogleInput({ ...emptyEventForm('2026-12-24'), title: 'x' })).toMatchObject({ date: '2026-12-24', endDate: '2026-12-24', allDay: true });
  });
  it('3. 시간 지정을 켠 경우에만 start/end 저장', () => {
    const timed = { ...emptyEventForm('2026-11-02'), ...toggleScheduleTime(emptyEventForm('2026-11-02')), title: 'x' };
    expect(formToGoogleInput(timed)).toMatchObject({ allDay: false, startTime: '09:00', endTime: '10:00' });
  });
  it('4. 신규 23:30 시작 → 같은 날 23:59 종료', () => {
    const base = emptyEventForm('2026-11-02');
    const f = { ...base, ...withScheduleStartTime({ ...base, allDay: false }, '23:30'), title: 'x' };
    expect(formToGoogleInput(f)).toMatchObject({ date: '2026-11-02', endDate: '2026-11-02', startTime: '23:30', endTime: '23:59' });
  });
  it('5. 기존 cross-day 일정 수정 시 다음 날 종료 보존', async () => {
    const ev = { id: 'onefc:9', sourceId: 'onefc:9', title: '야간', description: '', allDay: false, startAt: '2026-11-02T14:30:00.000Z', endAt: '2026-11-02T16:00:00.000Z' } as unknown as ScheduleEvent;
    const form = { ...eventToForm(ev), title: '야간 수정' };
    expect(form).toMatchObject({ date: '2026-11-02', endDate: '2026-11-03', startTime: '23:30', endTime: '01:00' });
    req.mockResolvedValueOnce({});
    await updateOnefcSchedule('t', 'onefc:9', form);
    expect(req.mock.calls[0][0]).toBe('/api/schedules/9');
    expect(body()).toMatchObject({ date: '2026-11-02', endDate: '2026-11-03', startTime: '23:30', endTime: '01:00' });
  });
  it('6. 일정 삭제 → DELETE /api/schedules/:rawId', async () => {
    req.mockResolvedValueOnce({});
    await deleteOnefcSchedule('t', 'onefc:9');
    expect(req.mock.calls[0]).toEqual(['/api/schedules/9', expect.objectContaining({ method: 'DELETE' })]);
  });
});

describe('[할 일] 7–12', () => {
  const draft = { description: '서류', dueDate: '', dueTime: '', relatedCustomerId: '', relatedCustomerName: '' };
  it('7. 날짜만 있는 할 일 → dueTime null', async () => {
    req.mockResolvedValueOnce({ data: { todo: { id: '1', title: '서류', description: '서류', status: 'open' } } });
    await createTodo('t', buildTodoCreatePayload({ ...draft, dueDate: '2026-11-05' })).catch(() => undefined);
    expect(req.mock.calls[0][0]).toBe('/api/todos');
    expect(body()).toMatchObject({ dueDate: '2026-11-05', dueTime: null });
  });
  it('8–9. 날짜+시간이 있던 할 일은 시간을 건드리지 않으면 기존 dueTime 유지 (날짜 변경 포함)', () => {
    const d = todoFormDraftFromRecord({ description: '서류', title: '서류', dueDate: '2026-11-05', dueTime: '14:00', relatedEntityType: null, relatedEntityId: null, customerName: '' });
    expect(todoEditorDateTimePayload(d, 'edit')).toEqual({ dueDate: '2026-11-05', dueTime: '14:00' });
    expect(todoEditorDateTimePayload({ ...d, dueDate: '2026-11-06' }, 'edit')).toEqual({ dueDate: '2026-11-06', dueTime: '14:00' });
  });
  it('10. 날짜를 지우면 dueDate·dueTime 모두 null', () => {
    expect(todoEditorDateTimePayload({ ...draft, dueDate: '', dueTime: '14:00' }, 'edit')).toEqual({ dueDate: null, dueTime: null });
  });
  it('11–12. 할 일 수정 PATCH / 삭제 DELETE /api/todos/:id', async () => {
    req.mockResolvedValueOnce({ data: { todo: { id: '1', title: 'a', description: 'a', status: 'open' } } }).mockResolvedValueOnce({});
    await updateTodo('t', '1', { title: 'a' }).catch(() => undefined);
    await deleteTodo('t', '1');
    expect(req.mock.calls.map((c) => [c[0], c[1]?.method])).toEqual([['/api/todos/1', 'PATCH'], ['/api/todos/1', 'DELETE']]);
  });
  it('label: 할 일 화면은 "날짜", "마감일" 미노출', () => {
    const screen = read('todos/TodoFormScreen.tsx');
    expect(screen).toContain('label="날짜"');
    expect(screen).not.toMatch(/["'>]마감일/);
  });
});
