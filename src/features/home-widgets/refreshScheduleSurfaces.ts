import type { QueryClient } from '@tanstack/react-query';

import { scheduleQueryKeys } from '../schedule/queryKeys';
import type { ScheduleEventsResult, ScheduleTask } from '../schedule/types';
import { todoQueryKeys } from '../todos/queryKeys';
import { refreshWidgets, type WidgetSession } from './engine/widgetRefreshCoordinator';

function isScheduleResult(value: unknown): value is ScheduleEventsResult {
  if (!value || typeof value !== 'object') return false;
  const row = value as ScheduleEventsResult;
  return Array.isArray(row.events) && Array.isArray(row.tasks);
}

function matchesTodo(task: ScheduleTask, id: string): boolean {
  return task.source === 'onefc_todo' && (task.sourceId === id || task.id === id || task.id === `onefc_todo:${id}`);
}

/** 할 일 완료·재오픈 직후 일정 캐시의 상태만 바꾼다. 배지 계산이 재조회를 기다리지 않는다. */
export function markScheduleTodoStatus(queryClient: QueryClient, todoId: string, status: 'open' | 'completed'): void {
  const id = todoId.trim();
  if (!id) return;
  queryClient.setQueriesData({ queryKey: scheduleQueryKeys.all }, (current) => {
    if (!isScheduleResult(current)) return current;
    let changed = false;
    const tasks = current.tasks.map((task) => {
      if (!matchesTodo(task, id)) return task;
      changed = true;
      return { ...task, status };
    });
    return changed ? { ...current, tasks } : current;
  });
}

/**
 * 일정 화면·배지·위젯이 같은 서버 상태를 보게 한다.
 * 지연, 폴링, 화면 재마운트 없이 쿼리 무효화와 위젯 스냅샷 갱신만 한다.
 */
export async function refreshScheduleSurfaces(queryClient: QueryClient, session: WidgetSession | null): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: todoQueryKeys.all }),
  ]);
  if (!session?.token) return;
  await refreshWidgets(session, { reason: 'appMutation', widgetTypes: ['schedule', 'todo'], force: true });
}
