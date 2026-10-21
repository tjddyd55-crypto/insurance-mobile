import { ApiError } from '../../api/client';
import type { AuthUser } from '../../api/authApi';
import { getEnvironmentConfig } from '../../config/environment';
import { fetchScheduleEvents } from '../schedule/scheduleApi';
import { seoulYmd } from '../schedule/scheduleModel';
import type { ScheduleEventsResult } from '../schedule/types';
import { listTodos } from '../todos/todosApi';
import type { TodoRecord } from '../todos/types';
import { clearWidgetSnapshot, configureWidgets, installedWidgetCount, readWidgetSnapshot, writeWidgetSnapshot } from './widgetBridge';
import type { WidgetRefreshReason } from './widgetContract';
import { buildWidgetSnapshot, widgetAccountKey, widgetWindow } from './widgetSnapshot';

export type WidgetSyncSession = { token: string; user: Pick<AuthUser, 'id' | 'gaId'> };

export type WidgetSyncReason = WidgetRefreshReason | 'login' | 'foreground' | 'app_change';

export type WidgetSyncOutcome = 'skipped' | 'no_widgets' | 'written' | 'partial' | 'failed' | 'session_expired';

/** 같은 사유가 아닌 자동 갱신은 이 간격 안에서 한 번만(앱 전환·쿼리 갱신 폭주 방지). */
export const WIDGET_MIN_SYNC_INTERVAL_MS = 30_000;

let inflight: Promise<WidgetSyncOutcome> | null = null;
let lastSyncAt = 0;
let lastAccountKey: string | null = null;

export function resetWidgetSyncStateForTests(): void {
  inflight = null;
  lastSyncAt = 0;
  lastAccountKey = null;
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

/** 수동 새로고침만 refresh=1. 서버 간격 제한(429)이면 일반 조회로 다시 읽는다(오류를 위젯에 띄우지 않는다). */
async function fetchScheduleForWidget(token: string, from: string, to: string, refresh: boolean): Promise<ScheduleEventsResult> {
  if (!refresh) return fetchScheduleEvents(token, { from, to });
  try {
    return await fetchScheduleEvents(token, { from, to, refresh: true });
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) return fetchScheduleEvents(token, { from, to });
    throw error;
  }
}

async function runSync(session: WidgetSyncSession, reason: WidgetSyncReason, now: Date): Promise<WidgetSyncOutcome> {
  if ((await installedWidgetCount()) <= 0) return 'no_widgets';
  const scheme = getEnvironmentConfig().scheme;
  await configureWidgets(scheme);
  const accountKey = widgetAccountKey(session.user);
  const previous = await readWidgetSnapshot();
  if (previous && previous.accountKey !== accountKey) {
    // 다른 계정의 위젯 데이터는 새 데이터를 받기 전에 먼저 지운다.
    await clearWidgetSnapshot('account_changed');
  }
  const window = widgetWindow(seoulYmd(now));
  const [schedule, todos] = await Promise.allSettled([
    fetchScheduleForWidget(session.token, window.from, window.to, reason === 'manual'),
    listTodos(session.token),
  ]);
  const rejected = [schedule, todos].filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (rejected.some((result) => isUnauthorized(result.reason))) {
    await clearWidgetSnapshot('session_expired');
    return 'session_expired';
  }
  if (rejected.length === 2) return 'failed';
  const snapshot = buildWidgetSnapshot({
    user: session.user,
    scheme,
    now,
    schedule: schedule.status === 'fulfilled' ? schedule.value : null,
    todos: todos.status === 'fulfilled' ? (todos.value as TodoRecord[]) : null,
    previous: previous && previous.accountKey === accountKey ? previous : null,
  });
  const written = await writeWidgetSnapshot(snapshot);
  lastAccountKey = accountKey;
  if (!written) return 'failed';
  return rejected.length ? 'partial' : 'written';
}

/**
 * 위젯 데이터 갱신(SSOT = ONE FC 서버). 동시에 한 번만 돌고, 자동 갱신은 최소 간격을 둔다.
 * 위젯·앱 어느 쪽 실패도 앱 동작을 막지 않는다. 토큰은 이 함수 밖(위젯 저장소)으로 나가지 않는다.
 */
export function syncHomeWidgets(
  session: WidgetSyncSession | null,
  reason: WidgetSyncReason,
  options: { now?: Date; force?: boolean } = {},
): Promise<WidgetSyncOutcome> {
  if (!session?.token) {
    return clearWidgetSnapshot('logged_out').then(() => 'skipped' as const);
  }
  const now = options.now ?? new Date();
  const accountKey = widgetAccountKey(session.user);
  const forced = options.force || reason === 'manual' || reason === 'login' || reason === 'app_change' || accountKey !== lastAccountKey;
  if (inflight) return inflight;
  if (!forced && now.getTime() - lastSyncAt < WIDGET_MIN_SYNC_INTERVAL_MS) return Promise.resolve('skipped');
  lastSyncAt = now.getTime();
  inflight = runSync(session, reason, now)
    .catch(() => 'failed' as const)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** 로그아웃·세션 만료: 위젯의 개인 데이터를 즉시 지운다. */
export async function purgeHomeWidgets(reason: 'logged_out' | 'session_expired' = 'logged_out'): Promise<void> {
  lastAccountKey = null;
  lastSyncAt = 0;
  await clearWidgetSnapshot(reason);
}
