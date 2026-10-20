/**
 * 할 일 스택의 popToTop.
 * 라우트가 react-navigation 패키지를 직접 import 하면 SDK 56+ export가 실패한다.
 */
const POP_TODO_STACK_TO_LIST = { type: 'POP_TO_TOP' } as const;

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
    navigation.dispatch(POP_TODO_STACK_TO_LIST);
    return;
  }
  router.replace(TODO_LIST_HREF);
}

// ---------------- 진입 출처 기반 복귀(t402u) ----------------

/** 일정 관리에서 연 할 일 수정. 라우트 파라미터 `from` 값. */
export const TODO_RETURN_SOURCE_SCHEDULE = 'schedule' as const;

export type TodoReturnSource = typeof TODO_RETURN_SOURCE_SCHEDULE | 'todos';

/** 라우트 파라미터 from → 복귀 출처. 모르는 값·없음은 할 일 목록(기존 규칙). */
export function todoReturnSource(from: unknown): TodoReturnSource {
  const value = Array.isArray(from) ? from.at(-1) : from;
  return value === TODO_RETURN_SOURCE_SCHEDULE ? TODO_RETURN_SOURCE_SCHEDULE : 'todos';
}

type DrawerHistoryState = {
  routes?: { key?: string; name?: string }[];
  history?: { type?: string; key?: string }[];
};

type DrawerNavigation = {
  getState: () => DrawerHistoryState | undefined;
  goBack: () => void;
};

/** 일정 화면 Drawer 라우트 이름(`app/(app)/schedule/index.tsx`). */
function isScheduleDrawerRoute(name: string | undefined): boolean {
  return name === 'schedule' || name === 'schedule/index';
}

/**
 * Drawer(backBehavior='history') 기록에서 바로 이전 화면이 일정인지.
 * 일정 화면은 Drawer 에 마운트된 채 남아 있어 goBack 이면 보던 월·선택 날짜가 그대로다.
 */
export function previousDrawerRouteIsSchedule(state: DrawerHistoryState | undefined): boolean {
  const history = (state?.history ?? []).filter((entry) => entry.type === undefined || entry.type === 'route');
  if (history.length < 2) return false;
  const previousKey = history[history.length - 2]?.key;
  const previous = state?.routes?.find((route) => route.key === previousKey);
  return isScheduleDrawerRoute(previous?.name);
}

type TodoFormNavigation = TodoStackNavigation & {
  getParent: () => DrawerNavigation | undefined;
};

/**
 * 할 일 추가/수정 화면을 떠날 때(저장·삭제·취소·Android back) 한 곳.
 *  - 일정에서 열었고 Drawer 기록의 직전이 일정이면: 할 일 스택을 목록으로 접고 Drawer history 로 일정에 돌아간다.
 *  - 그 밖(할 일 목록, 딥링크·알림, 기록 없음): 기존 returnToTodoList.
 */
export function leaveTodoForm(navigation: TodoFormNavigation, router: TodoListRouter, source: TodoReturnSource): void {
  if (source === TODO_RETURN_SOURCE_SCHEDULE) {
    const drawer = navigation.getParent();
    if (drawer && previousDrawerRouteIsSchedule(drawer.getState())) {
      // 다음에 할 일 메뉴를 열면 이 수정 화면이 아니라 목록이 보이게 스택을 접는다.
      if (shouldPopTodoStackToList(navigation.getState())) navigation.dispatch(POP_TODO_STACK_TO_LIST);
      drawer.goBack();
      return;
    }
  }
  returnToTodoList(navigation, router);
}
