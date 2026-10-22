package expo.modules.onefchomewidgets

import android.content.Context
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JS ↔ Widget Engine. 종류별 봉투(JSON)만 주고받고 토큰은 받지 않는다. */
class OnefcHomeWidgetsModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext?.applicationContext) { "React context unavailable" }

  override fun definition() = ModuleDefinition {
    Name("OnefcHomeWidgets")

    AsyncFunction("configure") { scheme: String ->
      if (Regex("^[a-z][a-z0-9+.-]*$").matches(scheme)) WidgetCacheManager.setScheme(context, scheme)
    }

    AsyncFunction("writeEnvelope") { widgetType: String, json: String ->
      val type = OneFcWidgetType.fromId(widgetType)?.takeIf { it.enabled } ?: return@AsyncFunction false
      val ok = WidgetCacheManager.write(context, type, json)
      if (ok) {
        WidgetEngine.renderAll(context)
        WidgetScheduler.ensurePeriodic(context)
        WidgetScheduler.scheduleMidnight(context, WidgetCacheManager.read(context, type)?.timeZone)
      }
      ok
    }

    AsyncFunction("readEnvelope") { widgetType: String ->
      OneFcWidgetType.fromId(widgetType)?.let { WidgetCacheManager.read(context, it) }?.let { WidgetCacheManager.readRaw(context, it.widgetType) }
    }

    AsyncFunction("clearAll") { reason: String ->
      WidgetCacheManager.clearAll(context, if (reason in CLEAR_REASONS) reason else "logged_out")
      WidgetEngine.renderAll(context)
    }

    AsyncFunction("installedWidgetTypes") {
      WidgetEngine.installedTypes(context).map { it.id }
    }

    /** 날짜 모달 빠른 추가 결과(JSON). 토큰 없음. 받을 모달이 없으면 false. */
    AsyncFunction("reportQuickAddResult") { requestId: String, json: String ->
      QuickAddBus.report(requestId, json)
    }

    /**
     * 위젯에서 연 화면을 닫을 때 앱을 종료하지 않고 홈(위젯)이 보이게 작업을 뒤로 보낸다.
     * Activity 가 없으면 false. 호출부(구 바이너리·실패)는 앱 안 이동으로 돌아간다.
     */
    AsyncFunction("moveTaskToBack") {
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      runCatching { activity.moveTaskToBack(true) }.getOrDefault(false)
    }.runOnQueue(Queues.MAIN)
  }

  companion object {
    private val CLEAR_REASONS = setOf("logged_out", "session_expired", "account_changed", "schema_reset")
  }
}
