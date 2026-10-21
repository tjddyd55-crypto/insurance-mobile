package expo.modules.onefchomewidgets

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** 부팅·앱 업데이트: 인스턴스 상태 초기화 + 다시 그리기 + 갱신. 시간대·시각 변경·자정: 다시 그리기. */
class WidgetSystemReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    try {
      when (intent.action) {
        Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> {
          WidgetCacheManager.resetAllInstances(context)
          WidgetEngine.renderAll(context)
          WidgetScheduler.ensurePeriodic(context)
          WidgetScheduler.refreshNow(context, emptyList(), if (intent.action == Intent.ACTION_BOOT_COMPLETED) "boot" else "appUpdate", force = true)
        }
        Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_TIME_CHANGED -> WidgetEngine.renderAll(context)
        WidgetScheduler.ACTION_MIDNIGHT -> {
          WidgetEngine.renderAll(context)
          WidgetScheduler.refreshNow(context, emptyList(), "midnight", force = true)
        }
      }
    } catch (error: Throwable) {
    }
  }
}
