/** 1.0.5 출시 게이트 위젯 18–24: 데이터 갱신 트리거와 탭 딥링크. */
import { buildWidgetDeepLink } from '../engine/widgetDeepLink';

const fs = jest.requireActual<{ readFileSync: (f: string, e: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...p: string[]) => string }>('path');
declare const __dirname: string;
const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');

describe('[위젯] 18–24', () => {
  it('18–20. 일정 생성/수정/삭제·할 일 추가 성공 시 일정+할 일 위젯 강제 갱신', () => {
    const s = read('schedule/ScheduleScreen.tsx');
    expect(s).toContain("refreshWidgets({ token, user }, { reason: 'appMutation', widgetTypes: ['schedule', 'todo'], force: true })");
    expect((s.match(/onSuccess: afterWrite/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it('21. 할 일 생성/수정/삭제/완료 시 refreshScheduleSurfaces', () => {
    expect(read('todos/TodoFormScreen.tsx').match(/refreshScheduleSurfaces|invalidateTodoViews\(\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(read('todos/TodosScreen.tsx')).toContain('refreshScheduleSurfaces');
  });
  it('22. 포그라운드 복귀 시 갱신, 무한 polling 없음', () => {
    const h = read('home-widgets/useHomeWidgetSync.ts');
    expect(h).toContain("AppState.addEventListener('change'");
    expect(h).not.toMatch(/setInterval\(/);
  });
  it('23. 일정 위젯 탭 → 기존 일정 딥링크', () => {
    expect(buildWidgetDeepLink('onefc', 'schedule', 'open', { date: '2026-11-02', event: 'onefc:5' })).toBe('onefc://schedule?date=2026-11-02&event=onefc%3A5&src=widget&wt=schedule');
    expect(buildWidgetDeepLink('onefc', 'schedule', 'create', { date: '2026-11-02' })).toBe('onefc://schedule?date=2026-11-02&create=1&src=widget&wt=schedule');
  });
  it('24. 할 일 위젯 탭 → 목록/추가/수정 딥링크', () => {
    expect(buildWidgetDeepLink('onefc', 'todo', 'open')).toBe('onefc://todos?src=widget&wt=todo');
    expect(buildWidgetDeepLink('onefc', 'todo', 'create', { date: '2026-11-02' })).toBe('onefc://todos/new?dueDate=2026-11-02&src=widget&wt=todo');
    expect(buildWidgetDeepLink('onefc', 'todo', 'edit', { id: '7' })).toBe('onefc://todos/7/edit?src=widget&wt=todo');
  });
});
