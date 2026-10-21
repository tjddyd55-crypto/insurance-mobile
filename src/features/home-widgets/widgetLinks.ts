/**
 * 위젯 → 앱 deep link 계약. scheme 은 빌드 환경(onefc / onefc-dev)에서만 온다.
 * native(WidgetLinks.kt)도 같은 형식을 만든다. src=widget 은 로그인 후 원래 화면 복귀에 쓴다.
 *
 *   <scheme>://schedule?date=YYYY-MM-DD&src=widget[&event=<id>][&create=1]
 *   <scheme>://todos/new?dueDate=YYYY-MM-DD&src=widget
 *   <scheme>://todos/<todoId>/edit?src=widget
 */
export const WIDGET_LINK_SOURCE = 'widget' as const;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function assertScheme(scheme: string): string {
  if (!/^[a-z][a-z0-9+.-]*$/.test(scheme)) throw new Error('잘못된 앱 scheme');
  return scheme;
}

export function widgetScheduleLink(scheme: string, date: string, options: { event?: string; create?: boolean } = {}): string {
  const params = new URLSearchParams();
  if (YMD.test(date)) params.set('date', date);
  params.set('src', WIDGET_LINK_SOURCE);
  if (options.event) params.set('event', options.event);
  if (options.create) params.set('create', '1');
  return `${assertScheme(scheme)}://schedule?${params.toString()}`;
}

export function widgetTodoNewLink(scheme: string, dueDate: string): string {
  const params = new URLSearchParams();
  if (YMD.test(dueDate)) params.set('dueDate', dueDate);
  params.set('src', WIDGET_LINK_SOURCE);
  return `${assertScheme(scheme)}://todos/new?${params.toString()}`;
}

export function widgetTodoEditLink(scheme: string, todoId: string): string {
  return `${assertScheme(scheme)}://todos/${encodeURIComponent(todoId)}/edit?src=${WIDGET_LINK_SOURCE}`;
}

/** 라우트 파라미터 하나(배열이면 마지막). */
export function singleParam(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value.at(-1) : value;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export function validWidgetDate(value: unknown): string | undefined {
  const raw = singleParam(value);
  if (!raw || !YMD.test(raw)) return undefined;
  const [y, m, d] = raw.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.toISOString().slice(0, 10) === raw ? raw : undefined;
}

/** 로그인이 필요해 로그인 화면으로 보낸 위젯 링크를 로그인 후 한 번 연다(모듈 상태, 영구 저장 안 함). */
let pendingWidgetHref: string | null = null;

export function stashPendingWidgetHref(href: string | null): void {
  pendingWidgetHref = href && href.startsWith('/') ? href : null;
}

export function consumePendingWidgetHref(): string | null {
  const next = pendingWidgetHref;
  pendingWidgetHref = null;
  return next;
}

/** 현재 경로 + 검색 파라미터가 위젯에서 온 화면이면 앱 내부 href 를 돌려준다. */
export function widgetReturnHref(pathname: string, params: Record<string, unknown>): string | null {
  if (singleParam(params.src) !== WIDGET_LINK_SOURCE) return null;
  if (!/^\/(schedule|todos)(\/|$)/.test(pathname)) return null;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = singleParam(value);
    if (single && /^(date|event|create|dueDate|src)$/.test(key)) query.set(key, single);
  }
  return `${pathname}?${query.toString()}`;
}
