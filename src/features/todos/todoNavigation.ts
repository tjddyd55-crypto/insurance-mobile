/** `(app)` Drawer 기준 할 일 수정 라우트 이름. 파일 경로와 같아야 한다. */
export const TODO_EDIT_ROUTE_NAME = 'todos/[todoId]/edit';

/**
 * 라우트 파라미터에서 이번에 선택된 할 일 id만 고른다.
 * 같은 키가 배열로 쌓이면 마지막 값이 방금 누른 항목이다.
 */
export function todoEditScreenId(todoId: unknown): string | undefined {
  const value = Array.isArray(todoId) ? todoId.at(-1) : todoId;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Drawer는 라우트 이름이 같으면 화면 키를 유지한다.
 * id가 들어간 singular id가 달라져야 이전 수정 화면이 다음 항목에 재사용되지 않는다.
 */
export function todoEditSingularId(routeName: string, todoId: unknown): string {
  const screenId = todoEditScreenId(todoId);
  return screenId ? `${routeName}/${screenId}` : routeName;
}

export function todoEditPath(todoId: string): `/todos/${string}/edit` {
  return `/todos/${todoId}/edit`;
}
