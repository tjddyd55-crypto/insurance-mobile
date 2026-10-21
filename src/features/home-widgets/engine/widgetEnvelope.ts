import type { WidgetType } from './widgetTypes';
import { isWidgetType } from './widgetTypes';

/** 모든 위젯 공통 스냅샷 봉투. 바꾸면 버전을 올린다 — native 는 모르는 버전을 지우고 다시 받는다. */
export const WIDGET_ENGINE_SCHEMA_VERSION = 1 as const;

export type WidgetAuthState = 'signed_in' | 'signed_out' | 'expired';
export type WidgetSyncState = 'ready' | 'stale' | 'error';
/** 사용자에게 보이는 문구는 native 공통 문구로만 바뀐다(서버 오류 원문 노출 금지). */
export type WidgetErrorCode = 'network' | 'server' | 'unknown';

export type WidgetSnapshotEnvelope<P = unknown> = {
  schemaVersion: typeof WIDGET_ENGINE_SCHEMA_VERSION;
  widgetType: WidgetType;
  accountKey: string;
  gaId: number;
  userId: string;
  scheme: string;
  /** ISO 8601 */
  generatedAt: string;
  lastSuccessfulSyncAt: string | null;
  timeZone: string;
  authState: WidgetAuthState;
  syncState: WidgetSyncState;
  errorCode: WidgetErrorCode | null;
  /** null = 데이터 없는 위젯이거나 아직 한 번도 성공하지 못함. */
  payload: P | null;
};

export type WidgetIdentity = { id: string; gaId: number };

/** 계정 격리 키: 사용자 id + GA. */
export function widgetAccountKey(user: WidgetIdentity): string {
  return `u:${user.id}|ga:${user.gaId ?? 0}`;
}

/** 저장소에서 읽은 값 검증. 깨졌거나 버전·타입이 다르면 null(호출부는 지우고 다시 만든다). */
export function parseWidgetEnvelope(raw: unknown, expectedType?: WidgetType): WidgetSnapshotEnvelope | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<WidgetSnapshotEnvelope>;
  if (row.schemaVersion !== WIDGET_ENGINE_SCHEMA_VERSION) return null;
  if (!isWidgetType(row.widgetType) || (expectedType && row.widgetType !== expectedType)) return null;
  if (typeof row.accountKey !== 'string' || !row.accountKey) return null;
  return row as WidgetSnapshotEnvelope;
}
