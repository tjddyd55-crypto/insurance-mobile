/**
 * 홈 화면 위젯 JS ↔ Android native 계약(SSOT).
 * native: modules/onefc-home-widgets/android/.../WidgetSnapshot.kt 가 같은 필드를 읽는다.
 * 필드를 바꾸면 WIDGET_SNAPSHOT_VERSION 을 올린다(native 는 모르는 버전을 버리고 "앱을 열어 주세요"를 보인다).
 *
 * 개인정보 최소화: 제목·시각·id·완료 여부·앱 링크만. 설명·메모·고객명·전화·위치·상담/청구 내용은 넣지 않는다.
 * Google 토큰·ONE FC 토큰은 절대 넣지 않는다.
 */
export const WIDGET_SNAPSHOT_VERSION = 1 as const;

/** 앱 일정 정책 시간대(scheduleModel.seoulYmd 와 같은 기준). native 는 이 값을 ZoneId 로 쓴다. */
export const WIDGET_SCHEDULE_TIME_ZONE = 'Asia/Seoul' as const;

export type WidgetScheduleItemKind = 'event' | 'onefc_todo' | 'google_task';

export type WidgetScheduleEvent = {
  id: string;
  title: string;
  /** '종일' | 'HH:mm' | 'HH:mm ~ HH:mm' | '' */
  time: string;
  kind: WidgetScheduleItemKind;
  done: boolean;
  /** 앱 deep link(widgetLinks). */
  link: string;
};

export type WidgetScheduleDay = { date: string; items: WidgetScheduleEvent[] };

export type WidgetTodo = { id: string; title: string; completed: boolean; link: string };

export type WidgetTodoDay = { date: string; items: WidgetTodo[] };

export type WidgetSnapshot = {
  version: typeof WIDGET_SNAPSHOT_VERSION;
  /** 계정 격리 키(user id + GA). 바뀌면 native 가 위젯별 상태를 초기화한다. */
  accountKey: string;
  scheme: string;
  timeZone: string;
  /** ISO 8601 */
  lastUpdatedAt: string;
  schedule: {
    from: string;
    to: string;
    /** 일정이 있는 날만. 날짜 없는 할 일은 없다. */
    days: WidgetScheduleDay[];
    googleNotice: string | null;
    /** 이 스냅샷의 일정 부분을 서버에서 읽었는지(실패 시 이전 일정 유지 여부 판단). */
    ok: boolean;
  };
  todos: {
    from: string;
    to: string;
    days: WidgetTodoDay[];
    ok: boolean;
  };
};

export type WidgetClearReason = 'logged_out' | 'session_expired' | 'account_changed';

/** native 가 headless task 로 넘기는 갱신 사유. */
export type WidgetRefreshReason = 'manual' | 'periodic' | 'boot' | 'midnight' | 'widget_added' | 'app_update';

export const WIDGET_HEADLESS_TASK = 'OnefcHomeWidgetsRefresh' as const;
