import { ApiError } from '../../../api/client';
import { getEnvironmentConfig } from '../../../config/environment';
import { seoulYmd } from '../../schedule/scheduleModel';
import { widgetBridge } from '../widgetBridge';
import { WIDGET_ENGINE_SCHEMA_VERSION, widgetAccountKey, type WidgetErrorCode, type WidgetIdentity, type WidgetSnapshotEnvelope } from './widgetEnvelope';
import { enabledWidgetTypes, widgetDefinition } from './widgetRegistry';
import type { WidgetClearReason, WidgetRefreshReason, WidgetType } from './widgetTypes';

/** 앱 일정 정책 시간대(scheduleModel.seoulYmd 와 같은 기준). native 는 봉투의 timeZone 을 쓴다. */
export const WIDGET_APP_TIME_ZONE = 'Asia/Seoul' as const;

export type WidgetSession = { token: string; user: WidgetIdentity };

export type WidgetRefreshRequest = {
  reason: WidgetRefreshReason;
  /** 비우면 설치된 enabled 위젯 전부. */
  widgetTypes?: readonly WidgetType[];
  force?: boolean;
  now?: Date;
};

export type WidgetRefreshOutcome = 'skipped' | 'written' | 'stale' | 'failed' | 'session_expired';
export type WidgetRefreshResult = Partial<Record<WidgetType, WidgetRefreshOutcome>> & { purged?: WidgetClearReason };

/** 정책을 건너뛰고 바로 도는 사유. 나머지는 refreshPolicy.minAutoIntervalMs 로 묶는다. */
const IMMEDIATE_REASONS: ReadonlySet<WidgetRefreshReason> = new Set(['login', 'manual', 'accountChanged', 'boot', 'appUpdate', 'midnight', 'googleReconnect']);

const lastRunAt = new Map<WidgetType, number>();
let lastAccountKey: string | null = null;
let queue: Promise<unknown> = Promise.resolve();

export function resetWidgetRefreshStateForTests(): void {
  lastRunAt.clear();
  lastAccountKey = null;
  queue = Promise.resolve();
}

function errorCode(error: unknown): WidgetErrorCode {
  if (error instanceof ApiError) return error.status === 0 ? 'network' : error.status >= 500 ? 'server' : error.status === 403 ? 'forbidden' : 'unknown';
  return error instanceof TypeError ? 'network' : 'unknown';
}

function isAuthError(error: unknown): boolean {
  // 세션 무효화는 401 만(api/client 와 같은 규칙). 403 은 권한·플랜 문제라 해당 위젯만 실패 처리하고 다른 위젯 데이터는 유지.
  return error instanceof ApiError && error.status === 401;
}

export function shouldRun(type: WidgetType, reason: WidgetRefreshReason, force: boolean, nowMs: number): boolean {
  const definition = widgetDefinition(type);
  if (!definition?.enabled) return false;
  if (force || IMMEDIATE_REASONS.has(reason)) return true;
  if (reason === 'appMutation') return definition.refreshPolicy.onMutation === 'immediate';
  if (reason === 'periodic') return definition.refreshPolicy.periodicMinutes !== null;
  const last = lastRunAt.get(type) ?? 0;
  return nowMs - last >= definition.refreshPolicy.minAutoIntervalMs;
}

/** Registry 기반 전체 purge: 로그아웃·만료·계정 변경. native 는 모든 위젯 캐시·인스턴스 상태를 지우고 로그인 화면으로 다시 그린다. */
export async function purgeWidgets(reason: WidgetClearReason): Promise<void> {
  lastRunAt.clear();
  lastAccountKey = null;
  await widgetBridge.clearAll(reason);
}

async function runRefresh(session: WidgetSession | null, request: WidgetRefreshRequest): Promise<WidgetRefreshResult> {
  if (!session?.token) {
    await purgeWidgets('logged_out');
    return { purged: 'logged_out' };
  }
  const now = request.now ?? new Date();
  const installed = new Set(await widgetBridge.installedWidgetTypes());
  const targets = (request.widgetTypes ?? enabledWidgetTypes()).filter((type) => installed.has(type) && widgetDefinition(type)?.enabled);
  if (!targets.length) return {};

  const scheme = getEnvironmentConfig().scheme;
  await widgetBridge.configure(scheme);
  const accountKey = widgetAccountKey(session.user);
  const previousByType = new Map<WidgetType, WidgetSnapshotEnvelope | null>();
  for (const type of targets) previousByType.set(type, await widgetBridge.readEnvelope(type));
  const foreign = [...previousByType.values()].some((envelope) => envelope && envelope.accountKey !== accountKey);
  if (foreign || (lastAccountKey && lastAccountKey !== accountKey)) {
    await purgeWidgets('account_changed');
    previousByType.clear();
  }
  lastAccountKey = accountKey;

  const force = Boolean(request.force) || foreign;
  const runnable = targets.filter((type) => shouldRun(type, request.reason, force, now.getTime()));
  const result: WidgetRefreshResult = {};
  for (const type of targets) if (!runnable.includes(type)) result[type] = 'skipped';
  if (!runnable.length) return result;

  const today = seoulYmd(now);
  const loads = await Promise.allSettled(
    runnable.map(async (type) => {
      lastRunAt.set(type, now.getTime());
      const adapter = widgetDefinition(type)?.adapter;
      return adapter ? adapter.load({ token: session.token, scheme, now, today, reason: request.reason, previous: previousByType.get(type) ?? null }) : null;
    }),
  );
  if (loads.some((load) => load.status === 'rejected' && isAuthError(load.reason))) {
    await purgeWidgets('session_expired');
    return { ...result, purged: 'session_expired' };
  }

  await Promise.all(
    runnable.map(async (type, index) => {
      const load = loads[index]!;
      const previous = previousByType.get(type) ?? null;
      const base = {
        schemaVersion: WIDGET_ENGINE_SCHEMA_VERSION,
        widgetType: type,
        accountKey,
        gaId: session.user.gaId ?? 0,
        userId: session.user.id,
        scheme,
        generatedAt: now.toISOString(),
        timeZone: WIDGET_APP_TIME_ZONE,
        authState: 'signed_in' as const,
      };
      const envelope: WidgetSnapshotEnvelope =
        load.status === 'fulfilled'
          ? { ...base, lastSuccessfulSyncAt: now.toISOString(), syncState: 'ready', errorCode: null, payload: load.value }
          : {
              ...base,
              // 실패: 같은 계정의 마지막 성공 데이터를 유지(오프라인 캐시), 없으면 오류 상태.
              lastSuccessfulSyncAt: previous?.lastSuccessfulSyncAt ?? null,
              syncState: previous?.payload ? 'stale' : 'error',
              errorCode: errorCode(load.reason),
              payload: previous?.payload ?? null,
            };
      const written = await widgetBridge.writeEnvelope(envelope);
      result[type] = !written ? 'failed' : envelope.syncState === 'ready' ? 'written' : 'stale';
    }),
  );
  return result;
}

/** 공통 Refresh Coordinator. 호출은 순서대로 한 번에 하나(겹치는 요청이 서로 덮지 않게). */
export function refreshWidgets(session: WidgetSession | null, request: WidgetRefreshRequest): Promise<WidgetRefreshResult> {
  const next = queue.then(() => runRefresh(session, request)).catch(() => ({}) as WidgetRefreshResult);
  queue = next;
  return next;
}
