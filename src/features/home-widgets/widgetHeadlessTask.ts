import { AppRegistry } from 'react-native';

import { readAuthSession } from '../../auth/secureStorage';
import { WIDGET_HEADLESS_TASK, type WidgetRefreshReason } from './widgetContract';
import { purgeHomeWidgets, syncHomeWidgets } from './widgetSync';

const REASONS: WidgetRefreshReason[] = ['manual', 'periodic', 'boot', 'midnight', 'widget_added', 'app_update'];

function refreshReason(value: unknown): WidgetRefreshReason {
  return REASONS.includes(value as WidgetRefreshReason) ? (value as WidgetRefreshReason) : 'periodic';
}

/**
 * Android WorkManager(native)가 앱 UI 없이 부르는 위젯 갱신.
 * 토큰은 기존 expo-secure-store 세션에서만 읽고(새 저장소·사본 없음), 위젯 저장소에는 결과 DTO 만 쓴다.
 */
export async function runWidgetHeadlessRefresh(data: { reason?: unknown } | null | undefined): Promise<void> {
  try {
    const session = await readAuthSession();
    if (!session) {
      await purgeHomeWidgets('logged_out');
      return;
    }
    await syncHomeWidgets({ token: session.token, user: session.user }, refreshReason(data?.reason), { force: true });
  } catch {
    // 실패해도 위젯은 마지막 캐시를 보여 준다.
  }
}

let registered = false;

export function registerWidgetHeadlessTask(): void {
  if (registered) return;
  registered = true;
  AppRegistry.registerHeadlessTask(WIDGET_HEADLESS_TASK, () => runWidgetHeadlessRefresh);
}
