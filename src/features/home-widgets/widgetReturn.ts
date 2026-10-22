import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { singleParam, WIDGET_LINK_SOURCE } from './engine/widgetDeepLink';
import { refreshWidgets, type WidgetSession } from './engine/widgetRefreshCoordinator';
import type { WidgetType } from './engine/widgetTypes';
import { isWidgetType } from './engine/widgetTypes';
import { moveTaskToBack } from './widgetBridge';

/**
 * 위젯(src=widget)에서 연 화면을 닫으면 홈으로 돌아간다.
 * 저장·삭제 뒤에는 그 위젯을 먼저 갱신하고, Activity.moveTaskToBack 으로 작업을 뒤로 보낸다.
 * 앱을 종료하지 않는다. 함수가 없는 구 바이너리는 false 를 돌려 앱 안 이동을 유지한다.
 * 한 번 처리한 진입(nonce)은 지워서, 이후 앱 안 이동이 위젯 복귀로 처리되지 않게 한다.
 */

export function isWidgetOrigin(params: object): boolean {
  return singleParam((params as { src?: unknown }).src) === WIDGET_LINK_SOURCE;
}

export function widgetTypeOf(params: object): WidgetType | null {
  const value = singleParam((params as { wt?: unknown }).wt);
  return isWidgetType(value) ? value : null;
}

/** 같은 탭을 다시 구분하는 키. nonce(_w)가 없으면 한 번만 처리한다. */
export function widgetEntryId(params: object): string | null {
  if (!isWidgetOrigin(params)) return null;
  const type = widgetTypeOf(params) ?? 'widget';
  return `${type}|${singleParam((params as { _w?: unknown })._w) ?? 'once'}`;
}

const handledEntries = new Set<string>();
let previousInAppPath: string | null = null;
let skipNextInAppPath = false;

export function isPendingWidgetOrigin(params: object): boolean {
  const entryId = widgetEntryId(params);
  return entryId !== null && !handledEntries.has(entryId);
}

/** 로그인 직후 자동으로 깔리는 홈은 '사용자가 보던 화면'이 아니다. */
export function beginStashedWidgetOpen(): void {
  skipNextInAppPath = true;
}

export function isWarmStart(): boolean {
  return previousInAppPath !== null;
}

export function clearWidgetOrigin(entryId: string | null): void {
  if (entryId) handledEntries.add(entryId);
}

export function resetWidgetReturnForTests(): void {
  handledEntries.clear();
  previousInAppPath = null;
  skipNextInAppPath = false;
}

function isAuthPath(pathname: string): boolean {
  return pathname.startsWith('/(auth)') || pathname === '/login' || pathname === '/register' || pathname === '/password-reset';
}

/**
 * 위젯 링크 전에 보이던 경로를 기억한다.
 * 위젯 화면(일정·할 일 + src=widget)인 동안에는 이전 경로를 덮지 않는다.
 */
export function observeAppPath(pathname: string, params: object): void {
  if (isWidgetOrigin(params) && /^\/(schedule|todos)(\/|$)/.test(pathname)) return;
  if (!pathname || isAuthPath(pathname)) return;
  if (skipNextInAppPath) {
    skipNextInAppPath = false;
    return;
  }
  previousInAppPath = pathname;
}

export async function returnToWidget(input: {
  saved: boolean;
  widgetType: WidgetType | null;
  session: WidgetSession | null;
  entryId: string | null;
}): Promise<boolean> {
  clearWidgetOrigin(input.entryId);
  if (input.saved && input.widgetType && input.session?.token) {
    await refreshWidgets(input.session, {
      reason: 'appMutation',
      widgetTypes: [input.widgetType],
      force: true,
    });
  }
  return moveTaskToBack();
}

// ---------------- 일정 화면: 상세/추가 모달 ----------------

export type ScheduleModalFlags = {
  detail: boolean;
  form: boolean;
  task: boolean;
  deleting: boolean;
};

export function scheduleModalsOpen(flags: ScheduleModalFlags): boolean {
  return flags.detail || flags.form || flags.task || flags.deleting;
}

/** 위젯 링크가 상세(event) 또는 추가(create) 모달을 열 때만 복귀 흐름을 시작한다. */
export function shouldStartScheduleWidgetFlow(params: object, link: { itemId: string | null; create: boolean }): boolean {
  if (!isWidgetOrigin(params)) return false;
  return Boolean(link.itemId) || link.create;
}

export type ScheduleWidgetFlow = {
  active: boolean;
  sawModal: boolean;
  saved: boolean;
  entryId: string | null;
};

export type ScheduleWidgetEffect = 'none' | 'return' | 'end';

export type ScheduleWidgetStep = {
  flow: ScheduleWidgetFlow;
  effect: ScheduleWidgetEffect;
  saved: boolean;
  entryId: string | null;
};

export const INITIAL_SCHEDULE_WIDGET_FLOW: ScheduleWidgetFlow = {
  active: false,
  sawModal: false,
  saved: false,
  entryId: null,
};

function step(flow: ScheduleWidgetFlow, effect: ScheduleWidgetEffect = 'none'): ScheduleWidgetStep {
  return { flow, effect, saved: flow.saved, entryId: flow.entryId };
}

/** 모달을 한 번 연 뒤에 모두 닫히면 위젯으로 돌아간다. 고객/할 일로 넘어가면 흐름을 끝낸다. */
export function reduceScheduleWidgetFlow(
  flow: ScheduleWidgetFlow,
  event:
    | { type: 'link'; entryId: string }
    | { type: 'modals'; open: boolean }
    | { type: 'mark-saved' }
    | { type: 'navigate-away' },
): ScheduleWidgetStep {
  if (event.type === 'link') return armScheduleFlow(flow, event.entryId);
  if (event.type === 'mark-saved') return markScheduleFlowSaved(flow);
  if (event.type === 'navigate-away') return endScheduleFlow(flow);
  return onScheduleModals(flow, event.open);
}

function armScheduleFlow(flow: ScheduleWidgetFlow, entryId: string): ScheduleWidgetStep {
  if (flow.active && flow.entryId === entryId) return step(flow);
  return step({ active: true, sawModal: false, saved: false, entryId });
}

function markScheduleFlowSaved(flow: ScheduleWidgetFlow): ScheduleWidgetStep {
  if (!flow.active || flow.saved) return step(flow);
  return step({ ...flow, saved: true });
}

function endScheduleFlow(flow: ScheduleWidgetFlow): ScheduleWidgetStep {
  if (!flow.active) return step(flow);
  return { flow: INITIAL_SCHEDULE_WIDGET_FLOW, effect: 'end', saved: false, entryId: flow.entryId };
}

function onScheduleModals(flow: ScheduleWidgetFlow, open: boolean): ScheduleWidgetStep {
  if (!flow.active) return step(flow);
  if (open) return step(flow.sawModal ? flow : { ...flow, sawModal: true });
  if (!flow.sawModal) return step(flow);
  return { flow: INITIAL_SCHEDULE_WIDGET_FLOW, effect: 'return', saved: flow.saved, entryId: flow.entryId };
}

export type WidgetDrawerNavigation = {
  getState: () => { history?: { type?: string; key?: string }[] } | undefined;
  goBack: () => void;
};

export function drawerHasPreviousRoute(state: { history?: { type?: string; key?: string }[] } | undefined): boolean {
  const history = (state?.history ?? []).filter((entry) => entry.type === undefined || entry.type === 'route');
  return history.length >= 2;
}

/** 웜 스타트면 위젯 링크 전 화면으로 돌아간다. 콜드 스타트면 일정 화면(모달만 닫힌 상태)에 남긴다. */
export function planScheduleWidgetExit(warm: boolean, drawerHasPrevious: boolean): { restorePrevious: boolean } {
  return { restorePrevious: warm && drawerHasPrevious };
}

export async function completeScheduleWidgetReturn(input: {
  saved: boolean;
  widgetType: WidgetType | null;
  session: WidgetSession | null;
  entryId: string | null;
  navigation: WidgetDrawerNavigation;
}): Promise<boolean> {
  const plan = planScheduleWidgetExit(isWarmStart(), drawerHasPreviousRoute(input.navigation.getState()));
  const moved = await returnToWidget(input);
  if (!moved) return false;
  if (plan.restorePrevious) input.navigation.goBack();
  return true;
}

function syncScheduleWidgetModals(flow: { current: ScheduleWidgetFlow }, open: boolean, current: {
  widgetType: WidgetType | null;
  session: WidgetSession | null;
  navigation: WidgetDrawerNavigation;
}): void {
  const next = reduceScheduleWidgetFlow(flow.current, { type: 'modals', open });
  flow.current = next.flow;
  if (next.effect !== 'return') return;
  void completeScheduleWidgetReturn({
    saved: next.saved,
    widgetType: current.widgetType,
    session: current.session,
    entryId: next.entryId,
    navigation: current.navigation,
  });
}

export function useScheduleWidgetReturn(input: {
  open: boolean;
  widgetType: WidgetType | null;
  session: WidgetSession | null;
  navigation: WidgetDrawerNavigation;
}): {
  armScheduleWidgetFlow: (entryId: string) => void;
  markScheduleWidgetSaved: () => void;
  endScheduleWidgetFlow: () => void;
} {
  const flow = useRef(INITIAL_SCHEDULE_WIDGET_FLOW);
  const inputRef = useRef(input);
  useLayoutEffect(() => {
    inputRef.current = input;
  }, [input]);

  const armScheduleWidgetFlow = useCallback((entryId: string) => {
    flow.current = reduceScheduleWidgetFlow(flow.current, { type: 'link', entryId }).flow;
  }, []);

  const markScheduleWidgetSaved = useCallback(() => {
    flow.current = reduceScheduleWidgetFlow(flow.current, { type: 'mark-saved' }).flow;
  }, []);

  const endScheduleWidgetFlow = useCallback(() => {
    const next = reduceScheduleWidgetFlow(flow.current, { type: 'navigate-away' });
    flow.current = next.flow;
    if (next.effect === 'end') clearWidgetOrigin(next.entryId);
  }, []);

  const open = input.open;
  useEffect(() => {
    syncScheduleWidgetModals(flow, open, inputRef.current);
  }, [open]);

  return { armScheduleWidgetFlow, markScheduleWidgetSaved, endScheduleWidgetFlow };
}
