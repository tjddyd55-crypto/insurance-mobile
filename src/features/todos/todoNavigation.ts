import { StackActions } from '@react-navigation/native';

/** 할 일 스택 안의 수정 화면 이름. `app/(app)/todos/[todoId]/edit.tsx` */
export const TODO_EDIT_STACK_SCREEN = '[todoId]/edit';

export const TODO_LIST_HREF = '/todos' as const;

const TODO_STACK_SCREENS = new Set(['index', 'new', TODO_EDIT_STACK_SCREEN]);

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

export function todoEditPath(todoId: string): `/todos/${string}/edit` {
  return `/todos/${todoId}/edit`;
}

type TodoStackState = {
  type?: string;
  index?: number;
  routeNames?: string[];
};

type TodoStackNavigation = {
  getState: () => TodoStackState | undefined;
  dispatch: (action: { type: string }) => void;
};

type TodoListRouter = {
  replace: (href: typeof TODO_LIST_HREF) => void;
};

/**
 * 할 일 스택이 목록 위에 수정/추가 화면을 올리고 있을 때만 pop 한다.
 * 앱 루트 스택이나 Drawer로 착각해 홈으로 빠지지 않게 route 이름을 확인한다.
 */
export function shouldPopTodoStackToList(state: TodoStackState | undefined): boolean {
  if (!state || state.type !== 'stack') return false;
  if ((state.index ?? 0) <= 0) return false;
  const names = state.routeNames ?? [];
  return names.includes('index') && names.every((name) => TODO_STACK_SCREENS.has(name));
}

/**
 * 취소·시스템 뒤로가기·저장 후 이동은 Drawer history가 아니라 할 일 목록으로 간다.
 */
export function returnToTodoList(navigation: TodoStackNavigation, router: TodoListRouter): void {
  if (shouldPopTodoStackToList(navigation.getState())) {
    navigation.dispatch(StackActions.popToTop());
    return;
  }
  router.replace(TODO_LIST_HREF);
}
