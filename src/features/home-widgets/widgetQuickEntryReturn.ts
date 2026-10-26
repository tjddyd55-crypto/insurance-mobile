import { widgetQuickEntry } from './engine/widgetDeepLink';
import { moveTaskToBack, openQuickEntry } from './widgetBridge';

/**
 * 로그인 후 보관된 위젯 href 가 Native 모달 링크(quick=)이면 그 모달을 다시 열고 앱 작업은 홈 뒤로 보낸다.
 * 모달 저장·닫기 후에는 위젯 홈이 보인다(기존 widget-origin 홈 복귀와 같은 결과). quick 링크가 아니거나 못 열면 false.
 */
export async function resumeWidgetQuickEntry(href: string): Promise<boolean> {
  const entry = widgetQuickEntry(href);
  if (!entry) return false;
  if (!(await openQuickEntry(entry.date, entry.mode))) return false;
  await moveTaskToBack();
  return true;
}
