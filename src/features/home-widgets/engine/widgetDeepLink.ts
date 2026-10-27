import type { WidgetType } from './widgetTypes';

/**
 * 위젯 → 앱 deep link 공통 빌더. native WidgetDeepLink.kt 와 같은 표.
 *   <scheme>://<route>?<params>&src=widget&wt=<widgetType>
 * scheme 은 빌드 환경(onefc / onefc-dev)에서만 온다. route 는 이 표에 있는 것만.
 */
export const WIDGET_LINK_SOURCE = 'widget' as const;

export type WidgetLinkAction = 'open' | 'create' | 'edit';

type RouteBuilder = (params: Record<string, string>) => { path: string; query: Record<string, string> } | null;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const ROUTES: Partial<Record<WidgetType, Partial<Record<WidgetLinkAction, RouteBuilder>>>> = {
  schedule: {
    open: (p) => ({ path: 'schedule', query: pick({ date: dateOnly(p.date), event: p.event }) }),
    create: (p) => ({ path: 'schedule', query: pick({ date: dateOnly(p.date), create: '1' }) }),
  },
  todo: {
    open: () => ({ path: 'todos', query: {} }),
    create: (p) => ({ path: 'todos/new', query: pick({ dueDate: dateOnly(p.date) }) }),
    edit: (p) => (p.id ? { path: `todos/${encodeURIComponent(p.id)}/edit`, query: {} } : null),
  },
};

function dateOnly(value: string | undefined): string | undefined {
  return value && YMD.test(value) ? value : undefined;
}

function pick(values: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1])));
}

function assertScheme(scheme: string): string {
  if (!/^[a-z][a-z0-9+.-]*$/.test(scheme)) throw new Error('잘못된 앱 scheme');
  return scheme;
}

/** 표에 없는 위젯·동작이면 null(호출부는 링크 없이 앱 첫 화면). */
export function buildWidgetDeepLink(
  scheme: string,
  type: WidgetType,
  action: WidgetLinkAction,
  params: Record<string, string | undefined> = {},
): string | null {
  const route = ROUTES[type]?.[action]?.(pick(params));
  if (!route) return null;
  const query = new URLSearchParams(route.query);
  query.set('src', WIDGET_LINK_SOURCE);
  query.set('wt', type);
  return `${assertScheme(scheme)}://${route.path}?${query.toString()}`;
}

// ---------------- 라우트 파라미터 / 로그인 후 복귀 ----------------

export function singleParam(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value.at(-1) : value;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export function validWidgetDate(value: unknown): string | undefined {
  const raw = singleParam(value);
  if (!raw || !YMD.test(raw)) return undefined;
  const [y, m, d] = raw.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toISOString().slice(0, 10) === raw ? raw : undefined;
}

const RETURN_PATHS = /^\/(schedule|todos)(\/|$)/;
const RETURN_PARAMS = /^(date|event|create|dueDate|src|wt|quick)$/;

/** 위젯에서 연 화면이면 로그인 후 돌아갈 앱 내부 href. */
export function widgetReturnHref(pathname: string, params: Record<string, unknown>): string | null {
  if (singleParam(params.src) !== WIDGET_LINK_SOURCE || !RETURN_PATHS.test(pathname)) return null;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = singleParam(value);
    if (single && RETURN_PARAMS.test(key)) query.set(key, single);
  }
  return `${pathname}?${query.toString()}`;
}

let pendingWidgetHref: string | null = null;

/** 로그인 화면으로 보낸 위젯 링크를 로그인 후 한 번만 연다(메모리만, 영구 저장 안 함). */
export function stashPendingWidgetHref(href: string | null): void {
  pendingWidgetHref = href && href.startsWith('/') ? href : null;
}

export function consumePendingWidgetHref(): string | null {
  const next = pendingWidgetHref;
  pendingWidgetHref = null;
  return next;
}

export type WidgetQuickEntryMode = 'day' | 'createEvent' | 'createTodo';
export type WidgetQuickEntry = { date: string; mode: WidgetQuickEntryMode };

const QUICK_MODES: readonly WidgetQuickEntryMode[] = ['day', 'createEvent', 'createTodo'];

/**
 * 위젯 날짜 모달(로그아웃)의 로그인 링크: `/schedule|/todos?date=..&quick=<mode>&src=widget`.
 * 로그인 후 앱 화면이 아니라 같은 Native 모달(mode·date)을 다시 연다. 아니면 null(기존 흐름).
 */
export function widgetQuickEntry(href: string | null): WidgetQuickEntry | null {
  if (!href || !RETURN_PATHS.test(href.split('?')[0])) return null;
  const query = new URLSearchParams(href.includes('?') ? href.slice(href.indexOf('?') + 1) : '');
  const mode = query.get('quick') as WidgetQuickEntryMode | null;
  const date = query.get('date') ?? '';
  if (query.get('src') !== WIDGET_LINK_SOURCE || !mode || !QUICK_MODES.includes(mode) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { date, mode };
}
