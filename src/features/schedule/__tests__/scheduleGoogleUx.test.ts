import { googleIntegrationPermissions, scheduleGoogleWarning, tasksOnDay } from '../scheduleModel';
import { todoReturnSource } from '../../todos/todoNavigation';
import type { ScheduleGoogleState, ScheduleTask } from '../types';

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const read = (...parts: string[]) => fs.readFileSync(path.join(__dirname, '..', '..', ...parts), 'utf8');

function g(patch: Partial<Omit<ScheduleGoogleState, 'write'>> & { write?: Partial<ScheduleGoogleState['write']> } = {}): ScheduleGoogleState {
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
const task = (id: string, source: ScheduleTask['source'], dueDate: string | null): ScheduleTask =>
  ({ id, source, sourceId: id, title: id, dueDate, dueTime: null, status: 'open', notes: '', customerName: null } as unknown as ScheduleTask);

describe('undated todos are not date schedule items', () => {
  const tasks = [task('dated', 'onefc_todo', '2026-10-20'), task('undated', 'onefc_todo', null), task('gtask-undated', 'google_task', null), task('gtask', 'google_task', '2026-10-21')];
  it('undated ONE FC todo is excluded on every date', () => {
    for (const day of ['2026-10-01', '2026-10-19', '2026-10-20', '2026-10-31', '2026-11-05']) {
      expect(tasksOnDay(tasks, day).map((t) => t.id)).not.toContain('undated');
    }
  });
  it('dated todo shows only on its date', () => {
    expect(tasksOnDay(tasks, '2026-10-20').map((t) => t.id)).toEqual(['dated']);
    expect(tasksOnDay(tasks, '2026-10-19').map((t) => t.id)).toEqual([]);
  });
  it('undated Google task follows the same policy', () => {
    for (const day of ['2026-10-20', '2026-10-21', '2026-10-22']) {
      expect(tasksOnDay(tasks, day).map((t) => t.id)).not.toContain('gtask-undated');
    }
    expect(tasksOnDay(tasks, '2026-10-21').map((t) => t.id)).toEqual(['gtask']);
  });
  it('schedule screen has no 날짜 없음 section; todo screen keeps undated todos', () => {
    const screen = read('schedule', 'ScheduleScreen.tsx');
    expect(screen).not.toMatch(/undatedOpenTasks/);
    expect(screen).not.toMatch(/>날짜 없음</);
    expect(read('todos', 'todoPresentation.ts') + read('todos', 'TodosScreen.tsx')).toMatch(/날짜 없음|dueDate/);
  });
});

describe('Google status on schedule = small warning only', () => {
  it('connected (incl. write not yet granted) shows nothing', () => {
    expect(scheduleGoogleWarning(g())).toBeNull();
    expect(scheduleGoogleWarning(g({ write: { calendarWritable: false, needsWriteConsent: true } }))).toBeNull();
    expect(scheduleGoogleWarning(g({ configured: false, status: 'unconfigured', connected: false }))).toBeNull();
  });
  it('problems show a short warning', () => {
    expect(scheduleGoogleWarning(g({ connected: false, status: 'disconnected' }))).toEqual({ text: 'Google 일정 연결 필요' });
    expect(scheduleGoogleWarning(g({ status: 'needs_reauth' }))).toEqual({ text: 'Google 재연결 필요' });
    expect(scheduleGoogleWarning(g({ status: 'error' }))?.text).toContain('불러오지 못했습니다');
    expect(scheduleGoogleWarning(g({ tasks: { status: 'scope_missing', needsReconsent: true } }))).toEqual({ text: 'Google 할 일 권한 필요' });
  });
  it('schedule screen: no Google banner card / connect logic; warning links to profile Google 연동; header refresh kept', () => {
    const screen = read('schedule', 'ScheduleScreen.tsx');
    expect(screen).not.toMatch(/googleStatusBanner|openAuthSessionAsync|startGoogleConnectFromApp/);
    expect(screen).toMatch(/scheduleGoogleWarning\(data\.google\)/);
    expect(screen).toMatch(/label="연동 관리"[^\n]*router\.push\(GOOGLE_INTEGRATION_HREF\)/);
    expect(screen).toMatch(/rightAction=\{[\s\S]*?label="새로고침"/);
    expect(read('profile', 'googleIntegrationRoute.ts')).toMatch(/GOOGLE_INTEGRATION_HREF = '\/profile'/);
  });
});

describe('Google 연동 in 내 정보 관리', () => {
  it('profile renders the Google integration section', () => {
    const profile = read('profile', 'ProfileScreen.tsx');
    expect(profile).toMatch(/<GoogleIntegrationSection \/>/);
    expect(read('profile', 'GoogleIntegrationSection.tsx')).toMatch(/title: 'Google 연동'/);
  });
  it('connect/reconnect/write/refresh exist once (shared hook), OAuth via system auth session', () => {
    const hook = read('schedule', 'useGoogleIntegration.ts');
    expect(hook).toMatch(/WebBrowser\.openAuthSessionAsync\(started\.url, started\.returnUrl\)/);
    expect(hook).toMatch(/finally \{[\s\S]*?await reload\(\)/);
    const section = read('profile', 'GoogleIntegrationSection.tsx');
    expect(section).toMatch(/useGoogleIntegration\(\)/);
    expect(section).not.toMatch(/openAuthSessionAsync|startGoogleConnectFromApp|WebView|accessToken|refreshToken/);
  });
  it('permissions mirror server state', () => {
    expect(googleIntegrationPermissions(g()).every((p) => p.granted)).toBe(true);
    const partial = googleIntegrationPermissions(g({ write: { calendarWritable: false, tasksWritable: false }, tasks: { status: 'scope_missing', needsReconsent: true } }));
    expect(partial.filter((p) => p.granted).map((p) => p.key)).toEqual(['read']);
    expect(googleIntegrationPermissions(g({ status: 'needs_reauth' })).some((p) => p.granted)).toBe(false);
  });
});

describe('todo return source param', () => {
  it('only schedule is a special caller; unknown/missing = todos', () => {
    expect(todoReturnSource('schedule')).toBe('schedule');
    expect(todoReturnSource(['x', 'schedule'])).toBe('schedule');
    expect(todoReturnSource(undefined)).toBe('todos');
    expect(todoReturnSource('elsewhere')).toBe('todos');
  });
});
