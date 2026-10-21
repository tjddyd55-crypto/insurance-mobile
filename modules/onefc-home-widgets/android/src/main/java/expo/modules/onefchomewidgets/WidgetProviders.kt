package expo.modules.onefchomewidgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Bundle

/** 두 위젯 공통: 추가·삭제·크기 변경·새로고침. 예외는 삼킨다(런처 크래시 방지). */
abstract class BaseWidgetProvider : AppWidgetProvider() {
  abstract fun render(context: Context, manager: AppWidgetManager, widgetId: Int)
  abstract fun handleAction(context: Context, widgetId: Int, action: String, date: String?)

  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    safely { for (id in appWidgetIds) render(context, manager, id) }
  }

  override fun onEnabled(context: Context) {
    safely {
      WidgetScheduler.ensurePeriodic(context)
      // 처음 추가: 앱을 열지 않아도 로그인 상태면 바로 채운다.
      WidgetScheduler.refreshNow(context, "widget_added")
    }
  }

  override fun onDisabled(context: Context) {
    safely { if (WidgetRenderer.installedCount(context) == 0) WidgetScheduler.cancelAll(context) }
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    safely { for (id in appWidgetIds) WidgetStore.removeWidget(context, id) }
  }

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, widgetId: Int, newOptions: Bundle) {
    safely { render(context, manager, widgetId) }
  }

  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (!action.startsWith("expo.modules.onefchomewidgets.")) {
      super.onReceive(context, intent)
      return
    }
    safely {
      val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
      if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return@safely
      if (action == WidgetIntents.ACTION_REFRESH) {
        // 간격 제한(30초): 연타해도 서버 요청은 한 번. 서버의 refresh=1 429 정책과 별개로 위젯에서 먼저 막는다.
        if (WidgetStore.tryBeginManualRefresh(context)) {
          WidgetRenderer.renderAll(context)
          WidgetScheduler.refreshNow(context, "manual")
        }
        return@safely
      }
      handleAction(context, widgetId, action, intent.getStringExtra(WidgetIntents.EXTRA_DATE))
      render(context, AppWidgetManager.getInstance(context), widgetId)
    }
  }

  protected inline fun safely(block: () -> Unit) {
    try {
      block()
    } catch (error: Throwable) {
      // 민감 정보 없이 무시: 다음 갱신 때 다시 그린다.
    }
  }
}

class ScheduleWidgetProvider : BaseWidgetProvider() {
  override fun render(context: Context, manager: AppWidgetManager, widgetId: Int) =
    WidgetRenderer.renderSchedule(context, manager, widgetId)

  override fun handleAction(context: Context, widgetId: Int, action: String, date: String?) {
    val snapshot = WidgetStore.snapshot(context) ?: return
    val today = WidgetDates.today(snapshot.timeZone)
    val state = WidgetStore.scheduleState(context, widgetId, today)
    val next = when (action) {
      WidgetIntents.ACTION_PREV, WidgetIntents.ACTION_NEXT -> {
        val month = WidgetDates.shiftMonth(state.month, if (action == WidgetIntents.ACTION_PREV) -1 else 1)
        // 앱 일정 화면과 같은 규칙: 이번 달이면 오늘, 아니면 1일 선택.
        WidgetStore.State(month, if (month == WidgetDates.monthStart(today)) today else month)
      }
      WidgetIntents.ACTION_TODAY -> WidgetStore.State(WidgetDates.monthStart(today), today)
      WidgetIntents.ACTION_SELECT -> {
        if (!WidgetDates.isYmd(date)) return
        WidgetStore.State(WidgetDates.monthStart(date!!), date)
      }
      else -> return
    }
    WidgetStore.saveScheduleState(context, widgetId, today, next)
  }
}

class TodoWidgetProvider : BaseWidgetProvider() {
  override fun render(context: Context, manager: AppWidgetManager, widgetId: Int) =
    WidgetRenderer.renderTodo(context, manager, widgetId)

  override fun handleAction(context: Context, widgetId: Int, action: String, date: String?) {
    val snapshot = WidgetStore.snapshot(context) ?: return
    val today = WidgetDates.today(snapshot.timeZone)
    val current = WidgetStore.todoDate(context, widgetId, today)
    val next = when (action) {
      WidgetIntents.ACTION_PREV -> WidgetDates.addDays(current, -1)
      WidgetIntents.ACTION_NEXT -> WidgetDates.addDays(current, 1)
      WidgetIntents.ACTION_TODAY -> today
      else -> return
    }
    WidgetStore.saveTodoDate(context, widgetId, today, next)
  }
}
