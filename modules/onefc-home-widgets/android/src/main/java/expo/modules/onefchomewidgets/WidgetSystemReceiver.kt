package expo.modules.onefchomewidgets

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 부팅·앱 업데이트: 위젯별 상태(보던 달·날짜)를 초기화하고 오늘 기준으로 다시 그린 뒤 갱신을 예약한다.
 * 시간대·시각 변경·자정: 다시 그리기(오늘 표시 이동).
 */
class WidgetSystemReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    try {
      when (intent.action) {
        Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> {
          WidgetStore.resetAllWidgetStates(context)
          WidgetRenderer.renderAll(context)
          WidgetScheduler.ensurePeriodic(context)
          WidgetScheduler.refreshNow(context, if (intent.action == Intent.ACTION_BOOT_COMPLETED) "boot" else "app_update")
        }
        Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_TIME_CHANGED -> WidgetRenderer.renderAll(context)
        WidgetScheduler.ACTION_MIDNIGHT -> {
          WidgetRenderer.renderAll(context)
          WidgetScheduler.refreshNow(context, "midnight")
        }
      }
    } catch (error: Throwable) {
      // 무시
    }
  }
}
