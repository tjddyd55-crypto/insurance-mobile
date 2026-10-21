import { AppRegistry } from 'react-native';

import { readAuthSession } from '../../auth/secureStorage';
import { refreshWidgets, purgeWidgets } from './engine/widgetRefreshCoordinator';
import { isWidgetType, widgetRefreshReason } from './engine/widgetTypes';

/** native OneFcWidgetRefreshWorker 가 부르는 단일 headless entry. */
export const WIDGET_HEADLESS_TASK = 'OneFcWidgetsRefresh' as const;

export type WidgetHeadlessPayload = { widgetTypes?: unknown; reason?: unknown; force?: unknown; appWidgetIds?: unknown };

/**
 * 앱 UI 없이 위젯 갱신. 토큰은 기존 expo-secure-store 세션에서만 읽는다(사본 없음).
 * appWidgetIds 는 native 가 다시 그릴 대상이며 JS 는 위젯 종류 단위로만 갱신한다.
 */
export async function runWidgetHeadlessRefresh(data: WidgetHeadlessPayload | null | undefined): Promise<void> {
  try {
    const session = await readAuthSession();
    if (!session) {
      await purgeWidgets('logged_out');
      return;
    }
    const types = Array.isArray(data?.widgetTypes) ? data.widgetTypes.filter(isWidgetType) : undefined;
    await refreshWidgets(
      { token: session.token, user: session.user },
      { reason: widgetRefreshReason(data?.reason), widgetTypes: types?.length ? types : undefined, force: data?.force === true },
    );
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
