package expo.modules.onefchomewidgets

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JS ↔ 위젯 다리. 스냅샷(DTO JSON)만 주고받고 토큰은 받지 않는다. */
class OnefcHomeWidgetsModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext?.applicationContext) { "React context unavailable" }

  override fun definition() = ModuleDefinition {
    Name("OnefcHomeWidgets")

    AsyncFunction("configure") { scheme: String ->
      if (Regex("^[a-z][a-z0-9+.-]*$").matches(scheme)) WidgetStore.setScheme(context, scheme)
    }

    AsyncFunction("writeSnapshot") { json: String ->
      val ok = WidgetStore.writeSnapshot(context, json)
      if (ok) {
        WidgetRenderer.renderAll(context)
        WidgetScheduler.ensurePeriodic(context)
      }
      ok
    }

    AsyncFunction("readSnapshot") {
      WidgetStore.snapshotJson(context)
    }

    AsyncFunction("clearSnapshot") { reason: String ->
      WidgetStore.clear(context, if (reason in setOf("logged_out", "session_expired", "account_changed")) reason else "logged_out")
      WidgetRenderer.renderAll(context)
    }

    AsyncFunction("installedWidgetCount") {
      WidgetRenderer.installedCount(context)
    }
  }
}
