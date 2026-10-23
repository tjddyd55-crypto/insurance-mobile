import type { WidgetSnapshotEnvelope } from '../engine/widgetEnvelope';
import type { WidgetRefreshReason } from '../engine/widgetTypes';

export type WidgetAdapterContext = {
  /** 기존 ONE FC 로그인 토큰. 어댑터 밖(위젯 저장소)으로 나가지 않는다. */
  token: string;
  scheme: string;
  now: Date;
  /** 앱 일정 정책 시간대 기준 오늘(YYYY-MM-DD). */
  today: string;
  reason: WidgetRefreshReason;
  previous: WidgetSnapshotEnvelope | null;
};

/** 위젯 하나의 데이터 로더. 기존 API·선택자만 쓴다. 실패는 throw(ApiError 401 이면 엔진이 purge). */
export type WidgetAdapter<P> = {
  load(context: WidgetAdapterContext): Promise<P>;
};

export const WIDGET_TITLE_MAX = 80;

export function clipWidgetTitle(title: string): string {
  const oneLine = title.replace(/\s+/g, ' ').trim();
  return oneLine.length > WIDGET_TITLE_MAX ? `${oneLine.slice(0, WIDGET_TITLE_MAX - 1)}…` : oneLine || '(제목 없음)';
}
