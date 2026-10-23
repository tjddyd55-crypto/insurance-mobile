import type { WidgetAdapter } from '../adapters/adapterTypes';
import { scheduleWidgetAdapter } from '../adapters/scheduleWidgetAdapter';
import { todoWidgetAdapter } from '../adapters/todoWidgetAdapter';
import { scheduleQueryKeys } from '../../schedule/queryKeys';
import { todoQueryKeys } from '../../todos/queryKeys';
import type { WidgetDataKind, WidgetRefreshPolicy, WidgetSensitiveDataPolicy, WidgetType } from './widgetTypes';
import { isWidgetType, WIDGET_TYPES } from './widgetTypes';

export type WidgetDefinition = {
  type: WidgetType;
  /** payload 버전(엔진 schemaVersion 과 별개). */
  version: number;
  displayName: string;
  /** false 면 갱신·노출 안 함. native provider 도 없다(manifest 에 없음). */
  enabled: boolean;
  dataKind: WidgetDataKind;
  refreshPolicy: WidgetRefreshPolicy;
  /** native 캐시 키 = widget.<cacheKey> */
  cacheKey: string;
  /** null = 데이터 없는 위젯(빠른 실행 등). */
  adapter: WidgetAdapter<unknown> | null;
  /** native 렌더러 id(OneFcWidgetType.rendererId). */
  renderer: string;
  /** 앱 라우트 경로(widgetDeepLink 표의 기본). */
  deepLinkBase: string;
  requiresAuth: boolean;
  supportsManualRefresh: boolean;
  supportsDateNavigation: boolean;
  sensitiveDataPolicy: WidgetSensitiveDataPolicy;
  /** 이 쿼리 키(앞부분)가 바뀌면 앱 쓰기 후 갱신. */
  watchesQueryKeys: readonly string[];
};

const STANDARD_POLICY: WidgetRefreshPolicy = { periodicMinutes: 30, manualCooldownMs: 30_000, onMutation: 'immediate', minAutoIntervalMs: 30_000 };

function future(type: WidgetType, displayName: string, dataKind: WidgetDataKind, sensitiveDataPolicy: WidgetSensitiveDataPolicy): WidgetDefinition {
  return {
    type,
    version: 0,
    displayName,
    enabled: false,
    dataKind,
    refreshPolicy: dataKind === 'none' ? { ...STANDARD_POLICY, periodicMinutes: null, onMutation: 'none' } : STANDARD_POLICY,
    cacheKey: type,
    adapter: null,
    renderer: type,
    deepLinkBase: '',
    requiresAuth: true,
    supportsManualRefresh: dataKind !== 'none',
    supportsDateNavigation: false,
    sensitiveDataPolicy,
  watchesQueryKeys: [],
  };
}

/** 위젯 Registry(SSOT). 새 위젯은 여기·어댑터·native 렌더러/provider 를 함께 추가한다(docs/android-widget-architecture.md). */
export const WIDGET_REGISTRY: Readonly<Record<WidgetType, WidgetDefinition>> = {
  schedule: {
    type: 'schedule',
    version: 1,
    displayName: 'ONE FC 일정',
    enabled: true,
    dataKind: 'calendar',
    refreshPolicy: STANDARD_POLICY,
    cacheKey: 'schedule',
    adapter: scheduleWidgetAdapter as WidgetAdapter<unknown>,
    renderer: 'schedule',
    deepLinkBase: 'schedule',
    requiresAuth: true,
    supportsManualRefresh: true,
    supportsDateNavigation: true,
    sensitiveDataPolicy: 'titles_and_times',
    watchesQueryKeys: [scheduleQueryKeys.all[0]],
  },
  todo: {
    type: 'todo',
    version: 1,
    displayName: 'ONE FC 할 일',
    enabled: true,
    dataKind: 'dated_list',
    refreshPolicy: STANDARD_POLICY,
    cacheKey: 'todo',
    adapter: todoWidgetAdapter as WidgetAdapter<unknown>,
    renderer: 'todo',
    deepLinkBase: 'todos',
    requiresAuth: true,
    supportsManualRefresh: true,
    supportsDateNavigation: true,
    sensitiveDataPolicy: 'titles_and_times',
    watchesQueryKeys: [todoQueryKeys.all[0], scheduleQueryKeys.all[0]],
  },
  // 아래는 확장 자리만. enabled=false, adapter/native provider 없음, 위젯 목록에 나오지 않는다.
  notifications: future('notifications', 'ONE FC 알림', 'list', 'titles_and_times'),
  consultation: future('consultation', 'ONE FC 상담', 'list', 'counts_only'),
  claims: future('claims', 'ONE FC 청구', 'list', 'counts_only'),
  customerSummary: future('customerSummary', 'ONE FC 고객 현황', 'list', 'counts_only'),
  quickActions: future('quickActions', 'ONE FC 빠른 실행', 'none', 'no_user_data'),
  aiAssistant: future('aiAssistant', 'ONE FC AI 비서', 'none', 'no_user_data'),
};

/** 모르는 값이면 null(예외 없음). */
export function widgetDefinition(type: unknown): WidgetDefinition | null {
  return isWidgetType(type) ? WIDGET_REGISTRY[type] : null;
}

export function enabledWidgetTypes(): WidgetType[] {
  return WIDGET_TYPES.filter((type) => WIDGET_REGISTRY[type].enabled);
}

export function widgetTypesWatching(queryKeyHead: unknown): WidgetType[] {
  return enabledWidgetTypes().filter((type) => WIDGET_REGISTRY[type].watchesQueryKeys.includes(String(queryKeyHead)));
}
