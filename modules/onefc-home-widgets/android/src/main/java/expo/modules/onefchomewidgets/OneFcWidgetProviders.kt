package expo.modules.onefchomewidgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Bundle

/**
 * 얇은 provider: 시스템 콜백을 WidgetEngine 으로 넘기기만 한다(API·인증·업무 로직 없음).
 * 위젯 선택 목록의 항목 하나 = manifest receiver 하나 + appwidget-provider 메타데이터이므로
 * 한 클래스로 여러 항목을 만들 수 없다. 그래서 종류마다 한 줄짜리 하위 클래스를 둔다.
 */
abstract class BaseOneFcWidgetProvider(private val type: OneFcWidgetType) : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    safely { WidgetEngine.render(context, type, appWidgetIds) }
  }

  override fun onEnabled(context: Context) {
    safely { WidgetEngine.onAdded(context, type) }
  }

  override fun onDisabled(context: Context) {
    safely { WidgetEngine.onRemovedAll(context) }
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    safely { for (id in appWidgetIds) WidgetCacheManager.removeInstance(context, type, id) }
  }

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, widgetId: Int, newOptions: Bundle) {
    safely { WidgetEngine.renderOne(context, manager, type, widgetId) }
  }

  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (!action.startsWith(WidgetIntents.ACTION_PREFIX)) {
      super.onReceive(context, intent)
      return
    }
    safely {
      val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
      if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
        WidgetEngine.handleAction(context, type, widgetId, action, intent.getStringExtra(WidgetIntents.EXTRA_DATE))
      }
    }
  }

  private inline fun safely(block: () -> Unit) {
    try {
      block()
    } catch (error: Throwable) {
      // 런처 크래시 방지. 다음 갱신 때 다시 그린다.
    }
  }
}

class ScheduleWidgetProvider : BaseOneFcWidgetProvider(OneFcWidgetType.SCHEDULE)

class TodoWidgetProvider : BaseOneFcWidgetProvider(OneFcWidgetType.TODO)
