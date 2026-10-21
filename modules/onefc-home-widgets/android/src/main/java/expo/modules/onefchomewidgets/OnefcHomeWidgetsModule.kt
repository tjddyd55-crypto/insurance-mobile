package expo.modules.onefchomewidgets

import android.content.Context
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
  }

  companion object {
    private val CLEAR_REASONS = setOf("logged_out", "session_expired", "account_changed", "schema_reset")
  }
}
