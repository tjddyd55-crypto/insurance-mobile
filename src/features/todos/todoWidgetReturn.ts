import type { WidgetSession } from '../home-widgets/engine/widgetRefreshCoordinator';
import {
  drawerHasPreviousRoute,
  isPendingWidgetOrigin,
  isWarmStart,
  returnToWidget,
  widgetEntryId,
  type WidgetDrawerNavigation,
} from '../home-widgets/widgetReturn';
import type { WidgetType } from '../home-widgets/engine/widgetTypes';
import {
  POP_TODO_STACK_TO_LIST,
  returnToTodoList,
  shouldPopTodoStackToList,
  TODO_EDIT_STACK_SCREEN,
  TODO_LIST_HREF,
} from './todoNavigation';

/**
 * 위젯에서 연 할 일 추가/수정을 닫을 때의 스택 정리.
 *  - 목록 위에 있으면 목록으로 접는다.
 *  - 수정/추가만 있는 콜드 스타트는 목록으로 바꾼다.
 *  - 웜 스타트(링크 전에 보던 화면)는 그 화면으로 되돌린다.
 * 앱 안에서 연 경우는 여기로 오지 않고 leaveTodoForm 을 그대로 탄다.
 */

const TODO_STACK_SCREENS = new Set(['index', 'new', TODO_EDIT_STACK_SCREEN]);

export type TodoStackSnapshot = {
  type?: string;
  index?: number;
  routeNames?: string[];
  routes?: { name?: string }[];
};

const RESET_TODO_STACK_TO_LIST = { type: 'RESET', payload: { index: 0, routes: [{ name: 'index' }] } } as const;

export type TodoWidgetNavigation = {
  getState: () => TodoStackSnapshot | undefined;
  dispatch: (action: { type: string; payload?: unknown }) => void;
  getParent: () => (WidgetDrawerNavigation & { getState: () => { history?: { type?: string; key?: string }[] } | undefined }) | undefined;
};

export type TodoWidgetExitPlan = {
  popToList: boolean;
  replaceWithList: boolean;
  restorePrevious: boolean;
};

function isTodoStack(state: TodoStackSnapshot | undefined): boolean {
  if (!state || state.type !== 'stack') return false;
  const names = state.routeNames ?? [];
  return names.includes('index') && names.every((name) => TODO_STACK_SCREENS.has(name));
}

/** 할 일 스택인데 기록에 수정/추가만 있다(목록이 밑에 없음). 콜드 스타트 deep link. */
export function isEditOnlyTodoStack(state: TodoStackSnapshot | undefined): boolean {
  if (!isTodoStack(state) || (state?.index ?? 0) > 0) return false;
  const current = state?.routes?.[0]?.name;
  return current === 'new' || current === TODO_EDIT_STACK_SCREEN;
}

export function planTodoWidgetExit(input: {
  warm: boolean;
  stack: TodoStackSnapshot | undefined;
  drawerHasPrevious: boolean;
}): TodoWidgetExitPlan {
  const popToList = shouldPopTodoStackToList(input.stack);
  return {
    popToList,
    replaceWithList: !popToList && isEditOnlyTodoStack(input.stack),
    restorePrevious: input.warm && input.drawerHasPrevious,
  };
}

export function applyTodoWidgetExit(
  navigation: TodoWidgetNavigation,
  router: { replace: (href: typeof TODO_LIST_HREF) => void },
  plan: TodoWidgetExitPlan,
): void {
  if (plan.popToList) navigation.dispatch(POP_TODO_STACK_TO_LIST);
  else if (plan.replaceWithList && plan.restorePrevious) navigation.dispatch(RESET_TODO_STACK_TO_LIST);
  else if (plan.replaceWithList) returnToTodoList(navigation, router);
  // 웜 스타트는 스택만 목록으로 되돌린 뒤 Drawer 기록의 이전 화면으로 간다.
  if (plan.restorePrevious) navigation.getParent()?.goBack();
}

export async function leaveTodoOpenedFromWidget(input: {
  params: object;
  navigation: TodoWidgetNavigation;
  router: { replace: (href: typeof TODO_LIST_HREF) => void };
  saved: boolean;
  widgetType: WidgetType | null;
  session: WidgetSession | null;
  fallback: () => void;
}): Promise<void> {
  if (!isPendingWidgetOrigin(input.params)) {
    input.fallback();
    return;
  }
  const plan = planTodoWidgetExit({
    warm: isWarmStart(),
    stack: input.navigation.getState(),
    drawerHasPrevious: drawerHasPreviousRoute(input.navigation.getParent()?.getState()),
  });
  const moved = await returnToWidget({
    saved: input.saved,
    widgetType: input.widgetType,
    session: input.session,
    entryId: widgetEntryId(input.params),
  });
  if (!moved) {
    input.fallback();
    return;
  }
  applyTodoWidgetExit(input.navigation, input.router, plan);
}
