import { apiRequest } from '../../../api/client';
import { createGoogleTaskFromSchedule, fetchWriteTargets } from '../scheduleApi';
import {
  emptyEventForm,
  emptyTaskForm,
  seoulYmd,
  googleTasksNotice,
  normalizeScheduleEvents,
  normalizeWriteTargets,
  taskFormToGoogleInput,
  taskFormToTodoPayload,
  undatedOpenTasks,
  validateEventForm,
  validateTaskForm,
} from '../scheduleModel';
import type { ScheduleGoogleState } from '../types';

jest.mock('../../../api/client', () => {
  const actual = jest.requireActual('../../../api/client');
  return { ...actual, apiRequest: jest.fn() };
});

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const mockedRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

function google(patch: Partial<Omit<ScheduleGoogleState, 'write'>> & { write?: Partial<ScheduleGoogleState['write']> } = {}): ScheduleGoogleState {
  return {
    connected: true,
    status: 'connected',
    connectAllowed: true,
    configured: true,
    tasks: { status: 'connected', needsReconsent: false },
    ...(patch as Partial<Omit<ScheduleGoogleState, 'write'>>),
    write: { enabled: true, calendarWritable: true, tasksWritable: true, needsWriteConsent: false, ...patch.write },
  };
}

describe('일정 추가 — ONE FC 일정과 할 일 두 버튼', () => {
  it('ONE FC 일정은 캘린더 없이 저장하고, Google 에서 온 일정 수정은 캘린더가 있어야 한다', () => {
    const form = { ...emptyEventForm('2026-10-22'), title: '상담' };
    expect(validateEventForm(form, { calendarRequired: false })).toBeNull();
    expect(validateEventForm(form)).toContain('캘린더');
  });

  it('화면은 일정 추가·할 일 추가만 두고 3갈래 저장 위치는 없다', () => {
    const screen = read('ScheduleScreen.tsx');
    const model = read('scheduleModel.ts');
    expect(screen).toContain('일정 추가');
    expect(screen).toContain('할 일 추가');
    expect(screen).toContain('createOnefcSchedule');
    expect(screen).toContain("import { createTodo } from '../todos/todosApi'");
    expect(screen).not.toContain('저장 위치');
    expect(screen).not.toContain('SCHEDULE_STORAGE_LABEL');
    expect(screen).not.toContain('createGoogleTaskFromSchedule');
    expect(screen).not.toContain('createScheduleEvent(');
    expect(screen).toContain('label="시작일"');
    expect(screen).toContain('label="종료일"');
    expect(screen).toContain('label="날짜"');
    expect(screen).toContain('emptyTaskForm(selected)');
    expect(screen).toContain('emptyEventForm(selected)');
    expect(screen).toContain('emptyEventForm(linkTarget.date)');
    expect(screen).not.toContain('emptyTaskForm(seoulYmd())');
    expect(screen).not.toContain('emptyEventForm(seoulYmd())');
    expect(screen).toContain('time={formState.form.allDay ? \'\' : formState.form.startTime}');
    expect(screen).toContain('time={formState.form.allDay ? \'\' : formState.form.endTime}');
    expect(screen).toContain('time={taskState.form.dueTime}');
    expect(screen).not.toContain('ScheduleTimeField');
    expect(screen).not.toContain('onChangeText={(startTime)');
    expect(screen).not.toContain('onChangeText={(endTime)');
    expect(screen).not.toContain('onChangeText={(dueTime)');
    expect(read('ScheduleDateField.tsx')).toContain('시간 설정');
    expect(read('ScheduleDateField.tsx')).not.toContain('반복');
    expect(screen).not.toContain('반복');
    expect(screen).toContain('widgetArm.current.start');
    expect(screen).toContain('<WidgetQuickAddSheet');
    expect(screen).toContain('<TextField label="제목"');
    const todoForm = fs.readFileSync(path.join(__dirname, '..', '..', 'todos', 'TodoFormScreen.tsx'), 'utf8');
    expect(todoForm).toContain('!consultationId && isWidgetOrigin');
    expect(todoForm).toContain('<WidgetQuickAddSheet');
    expect(todoForm).toContain('label="내용"');
    expect(screen).not.toContain('onChangeText={(date)');
    expect(screen).not.toContain('onChangeText={(endDate)');
    expect(screen).not.toContain('onChangeText={(dueDate)');
    expect(model).not.toContain('SCHEDULE_STORAGE_LABEL');
    expect(model).not.toContain('storageAvailability');
  });

  it('서버 응답의 tasksWritable·google.tasks 상태를 읽는다', () => {
    const result = normalizeScheduleEvents({
      events: [],
      tasks: [],
      google: { connected: true, status: 'connected', write: { enabled: true, calendarWritable: false, tasksWritable: true }, tasks: { status: 'scope_missing', needsReconsent: true } },
    });
    expect(result.google.write.tasksWritable).toBe(true);
    expect(result.google.tasks).toEqual({ status: 'scope_missing', needsReconsent: true });
    expect(googleTasksNotice(result.google)).toContain('Google Tasks 읽기 권한');
    expect(googleTasksNotice(google({ tasks: { status: 'error', needsReconsent: false } }))).toContain('불러오지 못했습니다');
    expect(googleTasksNotice(google())).toBeNull();
    expect(googleTasksNotice(google({ connected: false, status: 'disconnected', tasks: { status: 'disconnected', needsReconsent: false } }))).toBeNull();
  });
});

describe('일정 관리 추가 — 할 일 폼', () => {
  it('추가 예정일은 KST 오늘 문자열이고, 비우면 날짜 없음으로 저장', () => {
    expect(seoulYmd(new Date('2026-10-01T14:59:00.000Z'))).toBe('2026-10-01');
    expect(seoulYmd(new Date('2026-10-01T15:00:00.000Z'))).toBe('2026-10-02');
    const today = seoulYmd(new Date('2026-10-01T15:00:00.000Z'));
    expect(emptyEventForm(today)).toMatchObject({ date: '2026-10-02', endDate: '2026-10-02', allDay: true });
    const form = { ...emptyTaskForm(today), title: '  서류 ' };
    expect(form.dueDate).toBe('2026-10-02');
    expect(taskFormToTodoPayload(form)).toEqual({ title: '서류', description: null, dueDate: '2026-10-02', dueTime: null });
    expect(taskFormToTodoPayload({ ...form, dueDate: '', dueTime: '09:00' })).toEqual({ title: '서류', description: null, dueDate: null, dueTime: null });
    expect(taskFormToGoogleInput({ ...form, taskListId: 'L1', dueDate: '' }, 'r'.repeat(32))).toEqual({ taskListId: 'L1', title: '서류', notes: '', dueDate: null, requestId: 'r'.repeat(32) });
  });

  it('검증: Google 할 일은 목록 필수, 제목 필수, 날짜·시각 형식', () => {
    const base = { ...emptyTaskForm('2026-10-21'), title: 'x' };
    expect(validateTaskForm(base, 'google_task')).toContain('목록');
    expect(validateTaskForm({ ...base, taskListId: 'L1' }, 'google_task')).toBeNull();
    expect(validateTaskForm({ ...base, title: ' ' }, 'onefc_todo')).toContain('제목');
    expect(validateTaskForm({ ...base, dueDate: '10/21' }, 'onefc_todo')).toContain('YYYY-MM-DD');
    expect(validateTaskForm({ ...base, dueTime: '25:00' }, 'onefc_todo')).toContain('HH:mm');
    expect(validateTaskForm({ ...base, dueDate: '', dueTime: '09:00' }, 'onefc_todo')).toContain('날짜');
    expect(validateTaskForm({ ...base, dueTime: '09:30' }, 'onefc_todo')).toBeNull();
  });

  it('날짜 없음: 예정일 없는 미완료만', () => {
    const { tasks } = normalizeScheduleEvents({
      events: [],
      tasks: [
        { id: 'google_task:L:1', source: 'google_task', title: '나', dueDate: null, status: 'open' },
        { id: 'google_task:L:2', source: 'google_task', title: '가', dueDate: null, status: 'open' },
        { id: 'google_task:L:3', source: 'google_task', title: '완료', dueDate: null, status: 'completed' },
        { id: 'onefc_todo:4', source: 'onefc_todo', title: '날짜', dueDate: '2026-10-21', status: 'open' },
      ],
      google: {},
    });
    expect(undatedOpenTasks(tasks).map((task) => task.title)).toEqual(['가', '나']);
  });
});

describe('일정 관리 추가 — 기존 서버 API만 사용', () => {
  beforeEach(() => mockedRequest.mockReset());

  it('Google 할 일은 /api/service-integrations/google/write/tasks, 목록은 /write/targets', async () => {
    mockedRequest.mockResolvedValueOnce({ calendars: [{ id: 'c', name: '내 캘린더', primary: true }], taskLists: [{ id: 'L1', name: '업무' }] });
    expect(await fetchWriteTargets('t')).toEqual({ calendars: [{ id: 'c', name: '내 캘린더', primary: true }], taskLists: [{ id: 'L1', name: '업무' }] });
    expect(mockedRequest.mock.calls[0]![0]).toBe('/api/service-integrations/google/write/targets');
    mockedRequest.mockResolvedValueOnce({});
    await createGoogleTaskFromSchedule('t', { taskListId: 'L1', title: 'a', notes: '', dueDate: '2026-10-21', dueTime: '' }, 'f'.repeat(32));
    const [url, init] = mockedRequest.mock.calls[1]!;
    expect(url).toBe('/api/service-integrations/google/write/tasks');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ taskListId: 'L1', title: 'a', notes: '', dueDate: '2026-10-21', requestId: 'f'.repeat(32) });
    expect(normalizeWriteTargets({ data: { taskLists: [{ id: 'X' }] } }).taskLists).toEqual([{ id: 'X', name: 'X' }]);
  });

  it('화면: Google 직접 호출 없음, ONE FC 할 일은 기존 todosApi, 저장 후 refresh=1', () => {
    const screen = read('ScheduleScreen.tsx');
    expect(screen).not.toMatch(/googleapis\.com/);
    expect(read('scheduleApi.ts')).not.toMatch(/googleapis\.com/);
    expect(screen).toContain("import { createTodo } from '../todos/todosApi'");
    expect(screen).toMatch(/fetchScheduleEvents\(token, \{ \.\.\.range, refresh: true \}\)/);
    expect(screen).toContain('날짜 없음');
    expect(screen).not.toMatch(/BackHandler|router\.replace|setTimeout/);
  });
});
