/**
 * ONE FC Android Widget Engine — 공통 타입.
 * native: modules/onefc-home-widgets/android/.../engine/OneFcWidgetType.kt 와 같은 id 를 쓴다.
 */
export const WIDGET_TYPES = [
  'schedule',
  'todo',
  'notifications',
  'consultation',
  'claims',
  'customerSummary',
  'quickActions',
  'aiAssistant',
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export function isWidgetType(value: unknown): value is WidgetType {
  return typeof value === 'string' && (WIDGET_TYPES as readonly string[]).includes(value);
}

export const WIDGET_REFRESH_REASONS = [
  'login',
  'appForeground',
  'appMutation',
  'manual',
  'periodic',
  'boot',
  'midnight',
  'appUpdate',
  'googleReconnect',
  'accountChanged',
] as const;

export type WidgetRefreshReason = (typeof WIDGET_REFRESH_REASONS)[number];

export function widgetRefreshReason(value: unknown, fallback: WidgetRefreshReason = 'periodic'): WidgetRefreshReason {
  return typeof value === 'string' && (WIDGET_REFRESH_REASONS as readonly string[]).includes(value)
    ? (value as WidgetRefreshReason)
    : fallback;
}

/** 위젯 데이터 모양. none = 데이터 없는 위젯(빠른 실행), list = 목록형(알림), calendar/dated_list = 날짜형. */
export type WidgetDataKind = 'calendar' | 'dated_list' | 'list' | 'none';

/** 홈 화면 노출 수준. 어떤 위젯도 연락처·주민번호·상담/청구 상세·토큰은 담지 않는다. */
export type WidgetSensitiveDataPolicy = 'titles_and_times' | 'counts_only' | 'no_user_data';

export type WidgetRefreshPolicy = {
  /** WorkManager 주기(분). null = 주기 갱신 없음. 최소 15. */
  periodicMinutes: number | null;
  /** 위젯 수동 새로고침 간격(native 와 같은 값). */
  manualCooldownMs: number;
  /** 앱 쓰기(뮤테이션) 후 즉시 갱신 여부. */
  onMutation: 'immediate' | 'none';
  /** 그 밖 자동 갱신(앱 복귀 등) 최소 간격. */
  minAutoIntervalMs: number;
};

export type WidgetClearReason = 'logged_out' | 'session_expired' | 'account_changed' | 'schema_reset';
