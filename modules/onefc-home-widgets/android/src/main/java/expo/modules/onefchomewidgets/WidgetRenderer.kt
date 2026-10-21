package expo.modules.onefchomewidgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews

/** RemoteViews 그리기. 어떤 예외도 위젯 호스트(런처)로 던지지 않고 안내 화면으로 대체한다. */
object WidgetRenderer {
  const val MAX_ROWS = 8

  fun scheduleIds(context: Context): IntArray = ids(context, ScheduleWidgetProvider::class.java)
  fun todoIds(context: Context): IntArray = ids(context, TodoWidgetProvider::class.java)
  fun installedCount(context: Context): Int = scheduleIds(context).size + todoIds(context).size

  private fun ids(context: Context, provider: Class<*>): IntArray =
    try {
      AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, provider))
    } catch (error: Exception) {
      IntArray(0)
    }

  fun renderAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    for (id in scheduleIds(context)) renderSchedule(context, manager, id)
    for (id in todoIds(context)) renderTodo(context, manager, id)
    WidgetScheduler.scheduleMidnight(context, WidgetStore.snapshot(context)?.timeZone)
  }

  // ---------------- 공통 ----------------

  private fun heightDp(manager: AppWidgetManager, widgetId: Int, fallback: Int): Int {
    val options: Bundle? = try { manager.getAppWidgetOptions(widgetId) } catch (error: Exception) { null }
    val max = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT) ?: 0
    return if (max > 0) max else fallback
  }

  internal fun scheduleRows(heightDp: Int, weeks: Int): Int =
    ((heightDp - (145 + weeks * 28) - 22) / 24).coerceIn(1, MAX_ROWS)

  internal fun todoRows(heightDp: Int): Int = ((heightDp - 106 - 22) / 26).coerceIn(1, MAX_ROWS)

  private fun statusText(context: Context, snapshot: WidgetSnapshot, notice: String?): String {
    if (WidgetStore.isRefreshing(context)) return "새로고침 중…"
    val parts = ArrayList<String>()
    if (snapshot.lastUpdatedAtMs > 0) parts.add("마지막 업데이트 ${WidgetDates.hm(snapshot.lastUpdatedAtMs, snapshot.timeZone)}")
    if (!notice.isNullOrBlank()) parts.add(notice)
    return parts.joinToString(" · ")
  }

  private fun messageViews(context: Context, title: String, message: String, sub: String): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.onefc_widget_message)
    views.setTextViewText(R.id.w_title, title)
    views.setTextViewText(R.id.w_msg_text, message)
    views.setTextViewText(R.id.w_msg_sub, sub)
    views.setOnClickPendingIntent(R.id.w_root, WidgetIntents.openApp(context, null, 0))
    return views
  }

  /** 스냅샷이 없을 때: 로그아웃/만료면 로그인 안내(개인 데이터 없음), 처음이면 준비 안내. */
  private fun placeholder(context: Context, title: String): RemoteViews {
    val reason = WidgetStore.clearReason(context)
    return if (reason == "logged_out" || reason == "session_expired" || reason == "account_changed") {
      messageViews(context, title, context.getString(R.string.onefc_widget_login_required), context.getString(R.string.onefc_widget_login_hint))
    } else {
      messageViews(context, title, if (WidgetStore.isRefreshing(context)) "불러오는 중…" else context.getString(R.string.onefc_widget_open_app_hint), "")
    }
  }

  private fun safeUpdate(context: Context, manager: AppWidgetManager, widgetId: Int, title: String, build: () -> RemoteViews) {
    val views = try {
      build()
    } catch (error: Exception) {
      messageViews(context, title, context.getString(R.string.onefc_widget_open_app_hint), "")
    }
    try {
      manager.updateAppWidget(widgetId, views)
    } catch (error: Exception) {
      // 런처가 사라졌거나 위젯이 제거됨: 무시
    }
  }

  // ---------------- 일정 ----------------

  fun renderSchedule(context: Context, manager: AppWidgetManager, widgetId: Int) {
    val title = context.getString(R.string.onefc_widget_schedule_name)
    safeUpdate(context, manager, widgetId, title) {
      val snapshot = WidgetStore.snapshot(context) ?: return@safeUpdate placeholder(context, title)
      buildSchedule(context, snapshot, widgetId, heightDp(manager, widgetId, 320))
    }
  }

  private fun buildSchedule(context: Context, snapshot: WidgetSnapshot, widgetId: Int, heightDp: Int): RemoteViews {
    val provider = ScheduleWidgetProvider::class.java
    val views = RemoteViews(context.packageName, R.layout.onefc_widget_schedule)
    val today = WidgetDates.today(snapshot.timeZone)
    val state = WidgetStore.scheduleState(context, widgetId, today)
    val nonce = System.currentTimeMillis() / 1000
    val scheme = snapshot.scheme

    views.setTextViewText(R.id.w_month, WidgetDates.monthTitle(state.month))
    views.setContentDescription(R.id.w_month, "${WidgetDates.monthTitle(state.month)}, 앱에서 열기")
    views.setOnClickPendingIntent(R.id.w_month, WidgetIntents.openApp(context, WidgetLinks.schedule(scheme, state.selected), nonce))
    views.setOnClickPendingIntent(R.id.w_prev, WidgetIntents.broadcast(context, provider, WidgetIntents.ACTION_PREV, widgetId))
    views.setOnClickPendingIntent(R.id.w_next, WidgetIntents.broadcast(context, provider, WidgetIntents.ACTION_NEXT, widgetId))
    views.setOnClickPendingIntent(R.id.w_today, WidgetIntents.broadcast(context, provider, WidgetIntents.ACTION_TODAY, widgetId))
    views.setViewVisibility(R.id.w_today, if (state.selected == today && state.month == WidgetDates.monthStart(today)) View.GONE else View.VISIBLE)
    views.setOnClickPendingIntent(R.id.w_refresh, WidgetIntents.broadcast(context, provider, WidgetIntents.ACTION_REFRESH, widgetId))
    views.setOnClickPendingIntent(R.id.w_add, WidgetIntents.openApp(context, WidgetLinks.schedule(scheme, state.selected, create = true), nonce))
    views.setContentDescription(R.id.w_add, "${WidgetDates.dayTitle(state.selected)} 일정 추가")

    val weeks = WidgetDates.monthGrid(state.month)
    val text = context.getColor(R.color.onefc_widget_text)
    val muted = context.getColor(R.color.onefc_widget_text_muted)
    val sunday = context.getColor(R.color.onefc_widget_sunday)
    val saturday = context.getColor(R.color.onefc_widget_saturday)
    val onBrand = context.getColor(R.color.onefc_widget_on_brand)
    for (row in 0 until 6) {
      views.setViewVisibility(WidgetIds.WEEKS[row], if (row < weeks.size) View.VISIBLE else View.GONE)
      if (row >= weeks.size) continue
      for (col in 0 until 7) {
        val cell = weeks[row][col]
        val cellId = WidgetIds.CELLS[row][col]
        val dayId = WidgetIds.DAYS[row][col]
        val dotId = WidgetIds.DOTS[row][col]
        val selected = cell.ymd == state.selected
        val isToday = cell.ymd == today
        val hasItems = !snapshot.scheduleDays[cell.ymd].isNullOrEmpty()
        views.setTextViewText(dayId, cell.day.toString())
        val color = when {
          selected -> onBrand
          !cell.inMonth -> muted
          col == 0 -> sunday
          col == 6 -> saturday
          else -> text
        }
        views.setTextColor(dayId, color)
        views.setInt(cellId, "setBackgroundResource", when {
          selected -> R.drawable.onefc_widget_selected
          isToday -> R.drawable.onefc_widget_today
          else -> 0
        })
        views.setImageViewResource(dotId, if (selected) R.drawable.onefc_widget_dot_on_brand else R.drawable.onefc_widget_dot)
        views.setViewVisibility(dotId, if (hasItems) View.VISIBLE else View.INVISIBLE)
        val label = StringBuilder(WidgetDates.dayTitle(cell.ymd))
        if (isToday) label.append(", 오늘")
        if (hasItems) label.append(", 일정 있음")
        if (selected) label.append(", 선택됨")
        views.setContentDescription(cellId, label.toString())
        views.setOnClickPendingIntent(cellId, WidgetIntents.broadcast(context, ScheduleWidgetProvider::class.java, WidgetIntents.ACTION_SELECT, widgetId, cell.ymd))
      }
    }

    val items = snapshot.scheduleDays[state.selected].orEmpty()
    val covered = snapshot.scheduleCovers(state.selected)
    views.setTextViewText(R.id.w_sel_title, WidgetDates.dayTitle(state.selected))
    views.setTextViewText(R.id.w_sel_count, if (items.isNotEmpty()) "${items.size}건" else "")
    val rows = scheduleRows(heightDp, weeks.size)
    val shown = if (items.size > rows) rows - 1 else items.size
    for (index in 0 until MAX_ROWS) {
      val rowId = WidgetIds.ITEMS[index]
      if (index >= shown.coerceAtLeast(0)) {
        views.setViewVisibility(rowId, View.GONE)
        continue
      }
      val item = items[index]
      views.setViewVisibility(rowId, View.VISIBLE)
      val time = when {
        item.time.isNotBlank() -> item.time
        item.kind == "event" -> ""
        else -> "할 일"
      }
      views.setTextViewText(WidgetIds.ITEM_TIMES[index], time)
      views.setTextViewText(WidgetIds.ITEM_TITLES[index], if (item.done) "✓ ${item.title}" else item.title)
      views.setTextColor(WidgetIds.ITEM_TITLES[index], if (item.done) muted else text)
      views.setContentDescription(rowId, listOf(time, item.title, if (item.done) "완료" else "").filter { it.isNotBlank() }.joinToString(", "))
      views.setOnClickPendingIntent(rowId, WidgetIntents.openApp(context, item.link.ifBlank { WidgetLinks.schedule(scheme, state.selected) }, nonce))
    }
    val more = items.size - shown.coerceAtLeast(0)
    if (more > 0) {
      views.setViewVisibility(R.id.w_more, View.VISIBLE)
      views.setTextViewText(R.id.w_more, "+${more}개 더보기")
      views.setOnClickPendingIntent(R.id.w_more, WidgetIntents.openApp(context, WidgetLinks.schedule(scheme, state.selected), nonce))
    } else {
      views.setViewVisibility(R.id.w_more, View.GONE)
    }
    if (items.isEmpty()) {
      views.setViewVisibility(R.id.w_empty, View.VISIBLE)
      views.setTextViewText(R.id.w_empty, if (covered) context.getString(R.string.onefc_widget_empty_schedule) else "이 날짜는 앱에서 볼 수 있어요 ›")
      views.setOnClickPendingIntent(R.id.w_empty, WidgetIntents.openApp(context, WidgetLinks.schedule(scheme, state.selected), nonce))
    } else {
      views.setViewVisibility(R.id.w_empty, View.GONE)
    }
    views.setTextViewText(R.id.w_status, statusText(context, snapshot, snapshot.googleNotice))
    return views
  }

  // ---------------- 할 일 ----------------

  fun renderTodo(context: Context, manager: AppWidgetManager, widgetId: Int) {
    val title = context.getString(R.string.onefc_widget_todo_name)
    safeUpdate(context, manager, widgetId, title) {
      val snapshot = WidgetStore.snapshot(context) ?: return@safeUpdate placeholder(context, title)
      buildTodo(context, snapshot, widgetId, heightDp(manager, widgetId, 180))
    }
  }

  private fun buildTodo(context: Context, snapshot: WidgetSnapshot, widgetId: Int, heightDp: Int): RemoteViews {
    val provider = TodoWidgetProvider::class.java
    val views = RemoteViews(context.packageName, R.layout.onefc_widget_todo)
    val today = WidgetDates.today(snapshot.timeZone)
    val date = WidgetStore.todoDate(context, widgetId, today)
    val nonce = System.currentTimeMillis() / 1000
    val scheme = snapshot.scheme
    val text = context.getColor(R.color.onefc_widget_text)
    val muted = context.getColor(R.color.onefc_widget_text_muted)

    views.setTextViewText(R.id.w_day_label, WidgetDates.todoDayLabel(date, today))
    views.setOnClickPendingIntent(R.id.w_day_label, WidgetIntents.openApp(context, "$scheme://todos", nonce))
    views.setOnClickPendingIntent(R.id.w_prev, WidgetIntents.broadcast(context, provider, WidgetIntents.ACTION_PREV, widgetId))
    views.setOnClickPendingIntent(R.id.w_next, WidgetIntents.broadcast(context, provider, WidgetIntents.ACTION_NEXT, widgetId))
    views.setOnClickPendingIntent(R.id.w_to_today, WidgetIntents.broadcast(context, provider, WidgetIntents.ACTION_TODAY, widgetId))
    views.setViewVisibility(R.id.w_to_today, if (date == today) View.GONE else View.VISIBLE)
    views.setOnClickPendingIntent(R.id.w_refresh, WidgetIntents.broadcast(context, provider, WidgetIntents.ACTION_REFRESH, widgetId))
    val addIntent = WidgetIntents.openApp(context, WidgetLinks.todoNew(scheme, date), nonce)
    views.setOnClickPendingIntent(R.id.w_add, addIntent)
    views.setContentDescription(R.id.w_add, "${WidgetDates.dayTitle(date)} 할 일 추가")
    views.setOnClickPendingIntent(R.id.w_empty_add, addIntent)

    val items = snapshot.todoDays[date].orEmpty()
    val rows = todoRows(heightDp)
    val shown = if (items.size > rows) rows - 1 else items.size
    for (index in 0 until MAX_ROWS) {
      val rowId = WidgetIds.TODOS[index]
      if (index >= shown.coerceAtLeast(0)) {
        views.setViewVisibility(rowId, View.GONE)
        continue
      }
      val item = items[index]
      views.setViewVisibility(rowId, View.VISIBLE)
      views.setTextViewText(WidgetIds.TODO_CHECKS[index], if (item.completed) "✓" else "○")
      views.setTextViewText(WidgetIds.TODO_TITLES[index], item.title)
      views.setTextColor(WidgetIds.TODO_TITLES[index], if (item.completed) muted else text)
      views.setContentDescription(rowId, "${item.title}, ${if (item.completed) "완료" else "미완료"}, 열기")
      views.setOnClickPendingIntent(rowId, WidgetIntents.openApp(context, item.link.ifBlank { "$scheme://todos" }, nonce))
    }
    val more = items.size - shown.coerceAtLeast(0)
    if (more > 0) {
      views.setViewVisibility(R.id.w_more, View.VISIBLE)
      views.setTextViewText(R.id.w_more, "+${more}개 더보기")
      views.setOnClickPendingIntent(R.id.w_more, WidgetIntents.openApp(context, "$scheme://todos", nonce))
    } else {
      views.setViewVisibility(R.id.w_more, View.GONE)
    }
    views.setViewVisibility(R.id.w_empty_box, if (items.isEmpty()) View.VISIBLE else View.GONE)
    views.setTextViewText(R.id.w_status, statusText(context, snapshot, null))
    return views
  }
}
