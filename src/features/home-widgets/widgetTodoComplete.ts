import { ApiError } from '../../api/client';
import { readAuthSession } from '../../auth/secureStorage';
import { completeTodo } from '../todos/todosApi';
import { widgetBridge } from './widgetBridge';
import { refreshWidgets } from './engine/widgetRefreshCoordinator';

/**
 * 위젯 ○ 직접 완료. native TodoComplete 가 headless(OneFcWidgetTodoComplete)로 부른다.
 * 앱이 이미 가진 로그인 세션 + completeTodo API 만 쓴다. 위젯 전용 토큰·낙관적 완료 없음.
 */
export const WIDGET_TODO_COMPLETE_TASK = 'OneFcWidgetTodoComplete' as const;

export type TodoCompletePayload = { requestId?: unknown; todoId?: unknown };
export type TodoCompleteInput = { requestId: string; todoId: string };
export type TodoCompleteResult =
  | { ok: true; requestId: string; todoId: string; refreshed: boolean }
  | { ok: false; requestId: string; todoId: string; code: 'login' | 'invalid' | 'server' | 'network'; message: string };

const REQUEST_ID = /^[0-9a-f]{32}$/;
/** 서버 Todo.id(숫자 문자열 등). 공백·제어문자 금지. */
const TODO_ID = /^[A-Za-z0-9._:-]{1,64}$/;

export function validateTodoComplete(data: TodoCompletePayload | null | undefined): TodoCompleteInput | null {
  const requestId = typeof data?.requestId === 'string' ? data.requestId : '';
  const todoId = typeof data?.todoId === 'string' ? data.todoId.trim() : '';
  if (!REQUEST_ID.test(requestId) || !TODO_ID.test(todoId)) return null;
  return { requestId, todoId };
}

function failure(requestId: string, todoId: string, error: unknown): TodoCompleteResult {
  if (error instanceof ApiError) {
    if (error.status === 401) return { ok: false, requestId, todoId, code: 'login', message: '로그인이 필요합니다' };
    if (error.status >= 400 && error.status < 500 && error.message) {
      return { ok: false, requestId, todoId, code: 'server', message: error.message };
    }
    return { ok: false, requestId, todoId, code: 'server', message: '완료하지 못했어요. 다시 시도해 주세요' };
  }
  return { ok: false, requestId, todoId, code: 'network', message: '연결이 불안정해요. 다시 시도해 주세요' };
}

/** completeTodo → 위젯 강제 갱신 → 결과를 native 로. 실패 시 완료로 표시하지 않는다. */
export async function runWidgetTodoComplete(data: TodoCompletePayload | null | undefined): Promise<TodoCompleteResult> {
  const requestId = typeof data?.requestId === 'string' ? data.requestId : '';
  const rawTodoId = typeof data?.todoId === 'string' ? data.todoId.trim() : '';
  const input = validateTodoComplete(data);
  let result: TodoCompleteResult;
  if (!input) {
    result = {
      ok: false,
      requestId,
      todoId: rawTodoId,
      code: 'invalid',
      message: '할 일을 확인하지 못했어요',
    };
  } else {
    result = await save(input);
  }
  // QuickAdd 와 같은 버스(reportQuickAddResult)로 native 에 전달.
  await widgetBridge.reportQuickAddResult(result.requestId, JSON.stringify(result));
  return result;
}

async function save(input: TodoCompleteInput): Promise<TodoCompleteResult> {
  const { requestId, todoId } = input;
  try {
    const session = await readAuthSession();
    if (!session) return { ok: false, requestId, todoId, code: 'login', message: '로그인이 필요합니다' };
    await completeTodo(session.token, todoId);
    let refreshed = false;
    try {
      const outcome = await refreshWidgets(
        { token: session.token, user: session.user },
        { reason: 'appMutation', widgetTypes: ['todo', 'schedule'], force: true },
      );
      refreshed = outcome.todo === 'written';
    } catch {
      refreshed = false;
    }
    return { ok: true, requestId, todoId, refreshed };
  } catch (error) {
    return failure(requestId, todoId, error);
  }
}
