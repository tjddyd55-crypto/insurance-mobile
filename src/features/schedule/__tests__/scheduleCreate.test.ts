import { apiRequest } from '../../../api/client';
import { createGoogleTaskFromSchedule, fetchWriteTargets } from '../scheduleApi';
import {
  emptyTaskForm,
  googleTasksNotice,
  normalizeScheduleEvents,
  normalizeWriteTargets,
  storageAvailability,
  taskFormToGoogleInput,
  taskFormToTodoPayload,
  undatedOpenTasks,
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

describe('일정 관리 추가 — 저장 위치 판정(웹 ScheduleGoogleWrite 와 같은 서버 상태)', () => {
  it('ONE FC 할 일은 Google 상태와 무관하게 항상 가능', () => {
    for (const g of [google({ connected: false, status: 'disconnected' }), google({ status: 'needs_reauth' }), google({ write: { enabled: false } })]) {
      expect(storageAvailability(g, 'onefc_todo')).toEqual({ available: true, reason: null });
    }
  });

  it('Google 일정/할 일은 연결·쓰기 플래그·각 scope 가 있어야 하고, 아니면 사유를 보여준다', () => {
    expect(storageAvailability(google(), 'google_event').available).toBe(true);
    expect(storageAvailability(google(), 'google_task').available).toBe(true);
    expect(storageAvailability(google({ connected: false, status: 'disconnected' }), 'google_event').reason).toContain('연결되어 있지 않습니다');
    expect(storageAvailability(google({ status: 'needs_reauth' }), 'google_task').reason).toContain('만료');
    expect(storageAvailability(google({ write: { enabled: false } }), 'google_event').reason).toContain('아직 Google 쓰기');
    const calendarOnly = google({ write: { tasksWritable: false } });
    expect(storageAvailability(calendarOnly, 'google_event').available).toBe(true);
    expect(storageAvailability(calendarOnly, 'google_task').reason).toContain('할 일 쓰기 권한');
    expect(storageAvailability(google({ write: { calendarWritable: false } }), 'google_event').reason).toContain('캘린더 쓰기 권한');
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
  it('선택한 날로 예정일을 채우고, 비우면 날짜 없음으로 저장', () => {
    const form = { ...emptyTaskForm('2026-10-21'), title: '  서류 ' };
    expect(form.dueDate).toBe('2026-10-21');
    expect(taskFormToTodoPayload(form)).toEqual({ title: '서류', description: null, dueDate: '2026-10-21', dueTime: null });
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
    expect(validateTaskForm({ ...base, dueDate: '', dueTime: '09:00' }, 'onefc_todo')).toContain('예정일');
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
