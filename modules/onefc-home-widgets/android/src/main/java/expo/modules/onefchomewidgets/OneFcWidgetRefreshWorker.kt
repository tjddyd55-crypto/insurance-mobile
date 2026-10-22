package expo.modules.onefchomewidgets

import android.content.Context
import androidx.work.Data
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.facebook.react.bridge.Arguments

/**
 * 모든 위젯 공통 단일 Worker. native 는 토큰을 읽거나 서버를 부르지 않는다.
 * 단일 headless entry(OneFcWidgetsRefresh)에 {widgetTypes, reason, force, appWidgetIds} 를 넘기면
 * 앱 JS 가 Registry 의 Adapter 로 봉투를 만들어 writeEnvelope 한다.
 */
class OneFcWidgetRefreshWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    val context = applicationContext
    val requested = inputData.getStringArray(KEY_TYPES).orEmpty().mapNotNull { OneFcWidgetType.fromId(it) }.filter { it.enabled }
    val installed = WidgetEngine.installedTypes(context)
    val types = (if (requested.isEmpty()) installed else requested.filter { it in installed })
    if (types.isEmpty()) return Result.success()
    try {
      WidgetCacheManager.markRefreshing(context, types)
      types.forEach { WidgetEngine.render(context, it) }
      runHeadless(
        context,
        types,
        inputData.getString(KEY_REASON) ?: "periodic",
        inputData.getBoolean(KEY_FORCE, false),
        inputData.getIntArray(KEY_IDS) ?: IntArray(0),
      )
    } catch (error: Throwable) {
      // 재시도 폭주 없이 다음 주기에 다시.
    } finally {
      try {
        WidgetCacheManager.clearRefreshing(context, types)
        types.forEach { WidgetEngine.render(context, it) }
        WidgetScheduler.scheduleMidnight(context, WidgetCacheManager.read(context, types.first())?.timeZone)
      } catch (error: Throwable) {
      }
    }
    return Result.success()
  }

  private fun runHeadless(context: Context, types: List<OneFcWidgetType>, reason: String, force: Boolean, ids: IntArray): Boolean =
    WidgetHeadless.run(context, TASK_NAME, TASK_TIMEOUT_MS) { data ->
      data.putArray("widgetTypes", Arguments.createArray().apply { types.forEach { pushString(it.id) } })
      data.putString("reason", reason)
      data.putBoolean("force", force)
      data.putArray("appWidgetIds", Arguments.createArray().apply { ids.forEach { pushInt(it) } })
    }

  companion object {
    const val KEY_TYPES = "widgetTypes"
    const val KEY_REASON = "reason"
    const val KEY_FORCE = "force"
    const val KEY_IDS = "appWidgetIds"
    const val TASK_NAME = "OneFcWidgetsRefresh"
    const val TASK_TIMEOUT_MS = 45_000L

    fun input(types: List<OneFcWidgetType>, reason: String, force: Boolean, ids: IntArray?): Data =
      Data.Builder()
        .putStringArray(KEY_TYPES, types.map { it.id }.toTypedArray())
        .putString(KEY_REASON, reason)
        .putBoolean(KEY_FORCE, force)
        .putIntArray(KEY_IDS, ids ?: IntArray(0))
        .build()
  }
}
