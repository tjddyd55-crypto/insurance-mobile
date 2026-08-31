import { ApiError, apiRequest } from '../../api/client';
import { normalizeTodo, normalizeTodoList } from './todoModel';
import type { ListTodosParams, SaveTodoPayload, TodoRecord } from './types';

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) throw new ApiError('로그인이 필요합니다.', 401);
  return value;
}

function buildQuery(params: ListTodosParams): string {
  const pairs = Object.entries(params)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

export async function listTodos(
  token: string | null,
  params: ListTodosParams = {},
): Promise<TodoRecord[]> {
  const body = await apiRequest<unknown>(`/api/todos${buildQuery(params)}`, {
    token: requireToken(token),
  });
  return normalizeTodoList(body);
}

export async function createTodo(
  token: string | null,
  payload: SaveTodoPayload,
): Promise<TodoRecord> {
  const body = await apiRequest<unknown>('/api/todos', {
    method: 'POST',
    token: requireToken(token),
    body: JSON.stringify(payload),
  });
  return normalizeTodo(body, '할 일 등록');
}

export async function updateTodo(
  token: string | null,
  todoId: string,
  payload: Partial<SaveTodoPayload>,
): Promise<TodoRecord> {
  const body = await apiRequest<unknown>(`/api/todos/${encodeURIComponent(todoId)}`, {
    method: 'PATCH',
    token: requireToken(token),
    body: JSON.stringify(payload),
  });
  return normalizeTodo(body, '할 일 수정');
}

async function patchTodoState(
  token: string | null,
  todoId: string,
  action: 'complete' | 'reopen',
): Promise<TodoRecord> {
  const body = await apiRequest<unknown>(`/api/todos/${encodeURIComponent(todoId)}/${action}`, {
    method: 'PATCH',
    token: requireToken(token),
    body: JSON.stringify({}),
  });
  return normalizeTodo(body, '할 일 상태 변경');
}

export const completeTodo = (token: string | null, todoId: string) =>
  patchTodoState(token, todoId, 'complete');

export const reopenTodo = (token: string | null, todoId: string) =>
  patchTodoState(token, todoId, 'reopen');

export async function deleteTodo(token: string | null, todoId: string): Promise<void> {
  await apiRequest<unknown>(`/api/todos/${encodeURIComponent(todoId)}`, {
    method: 'DELETE',
    token: requireToken(token),
  });
}
