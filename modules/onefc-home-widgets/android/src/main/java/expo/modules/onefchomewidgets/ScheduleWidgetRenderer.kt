package expo.modules.onefchomewidgets

import android.content.Context
import android.view.View
import android.widget.RemoteViews

/** ONE FC 일정: 월간 달력 + 선택 날짜 일정. 인스턴스 상태 = 보던 달(month) + 선택 날짜(selected). */
object ScheduleWidgetRenderer : OneFcWidgetRenderer {
  override val type = OneFcWidgetType.SCHEDULE
  const val MAX_ROWS = 8

  /** 높이(dp) → 일정 줄 수. 4x4 ≈ 3줄, 4x5~6 ≈ 5~8줄. */
  fun rows(heightDp: Int, weeks: Int): Int = ((heightDp - (145 + weeks * 28) - 22) / 24).coerceIn(1, MAX_ROWS)

  data class State(val month: String, val selected: String)

  fun state(context: Context, widgetId: Int, today: String): State {
    val month = WidgetCacheManager.instanceValue(context, type, widgetId, "month", today)
    val selected = WidgetCacheManager.instanceValue(context, type, widgetId, "selected", today)
    return if (WidgetDates.isYmd(month) && WidgetDates.isYmd(selected)) State(month!!, selected!!) else State(WidgetDates.monthStart(today), today)
  }

  /** 앱 일정 화면과 같은 이동 규칙(순수 함수). */
  fun next(state: State, action: String, date: String?, today: String): State? = when (action) {
    WidgetIntents.ACTION_PREV, WidgetIntents.ACTION_NEXT -> {
      val month = WidgetDates.shiftMonth(state.month, if (action == WidgetIntents.ACTION_PREV) -1 else 1)
      State(month, if (month == WidgetDates.monthStart(today)) today else month)
    }
    WidgetIntents.ACTION_TODAY -> State(WidgetDates.monthStart(today), today)
    WidgetIntents.ACTION_SELECT -> if (WidgetDates.isYmd(date)) State(WidgetDates.monthStart(date!!), date) else null
    else -> null
  }

  override fun hasPayload(envelope: WidgetEnvelope) = SchedulePayload.parse(envelope) != null

  override fun handleAction(context: Context, envelope: WidgetEnvelope?, widgetId: Int, action: String, date: String?): Boolean {
    val today = WidgetDates.today(envelope?.timeZone)
    val updated = next(state(context, widgetId, today), action, date, today) ?: return false
    WidgetCacheManager.saveInstance(context, type, widgetId, today, mapOf("month" to updated.month, "selected" to updated.selected))
    return true
  }

  override fun render(context: Context, envelope: WidgetEnvelope, widgetId: Int, heightDp: Int, refreshing: Boolean): RemoteViews? {
    val payload = SchedulePayload.parse(envelope) ?: return null
    val views = RemoteViews(context.packageName, R.layout.onefc_widget_schedule)
    val today = WidgetDates.today(envelope.timeZone)
    val state = state(context, widgetId, today)
    val nonce = System.currentTimeMillis() / 1000
    val scheme = envelope.scheme
    fun link(action: WidgetDeepLink.Action, params: Map<String, String?>) = WidgetDeepLink.build(scheme, type, action, params)

    views.setTextViewText(R.id.w_month, WidgetDates.monthTitle(state.month))
    views.setContentDescription(R.id.w_month, "${WidgetDates.monthTitle(state.month)}, 앱에서 열기")
    views.setOnClickPendingIntent(R.id.w_month, WidgetIntents.openApp(context, link(WidgetDeepLink.Action.OPEN, mapOf("date" to state.selected)), nonce))
    views.setOnClickPendingIntent(R.id.w_prev, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_PREV, widgetId))
    views.setOnClickPendingIntent(R.id.w_next, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_NEXT, widgetId))
    views.setOnClickPendingIntent(R.id.w_today, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_TODAY, widgetId))
    views.setViewVisibility(R.id.w_today, if (state.selected == today && state.month == WidgetDates.monthStart(today)) View.GONE else View.VISIBLE)
    WidgetCommonViews.bindRefresh(context, views, type, widgetId)
    views.setOnClickPendingIntent(R.id.w_add, WidgetIntents.openApp(context, link(WidgetDeepLink.Action.CREATE, mapOf("date" to state.selected)), nonce))
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
        val hasItems = cell.ymd in payload.calendarDays
        views.setTextViewText(dayId, cell.day.toString())
        views.setTextColor(dayId, when {
          selected -> onBrand
          !cell.inMonth -> muted
          col == 0 -> sunday
          col == 6 -> saturday
          else -> text
        })
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
        views.setOnClickPendingIntent(cellId, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_SELECT, widgetId, cell.ymd))
      }
    }

    val items = payload.events[state.selected].orEmpty()
    val dayLink = link(WidgetDeepLink.Action.OPEN, mapOf("date" to state.selected))
    views.setTextViewText(R.id.w_sel_title, WidgetDates.dayTitle(state.selected))
    views.setTextViewText(R.id.w_sel_count, if (items.isNotEmpty()) "${items.size}건" else "")
    val maxRows = rows(heightDp, weeks.size)
    val shown = (if (items.size > maxRows) maxRows - 1 else items.size).coerceAtLeast(0)
    for (index in 0 until MAX_ROWS) {
      val rowId = WidgetIds.ITEMS[index]
      if (index >= shown) {
        views.setViewVisibility(rowId, View.GONE)
        continue
      }
      val item = items[index]
      val time = when {
        item.time.isNotBlank() -> item.time
        item.kind == "event" -> ""
        else -> "할 일"
      }
      views.setViewVisibility(rowId, View.VISIBLE)
      views.setTextViewText(WidgetIds.ITEM_TIMES[index], time)
      views.setTextViewText(WidgetIds.ITEM_TITLES[index], if (item.done) "✓ ${item.title}" else item.title)
      views.setTextColor(WidgetIds.ITEM_TITLES[index], if (item.done) muted else text)
      views.setContentDescription(rowId, listOf(time, item.title, if (item.done) "완료" else "").filter { it.isNotBlank() }.joinToString(", "))
      views.setOnClickPendingIntent(rowId, WidgetIntents.openApp(context, item.link.ifBlank { dayLink }, nonce))
    }
    val more = items.size - shown
    views.setViewVisibility(R.id.w_more, if (more > 0) View.VISIBLE else View.GONE)
    if (more > 0) {
      views.setTextViewText(R.id.w_more, "+${more}개 더보기")
      views.setOnClickPendingIntent(R.id.w_more, WidgetIntents.openApp(context, dayLink, nonce))
    }
    views.setViewVisibility(R.id.w_empty, if (items.isEmpty()) View.VISIBLE else View.GONE)
    if (items.isEmpty()) {
      views.setTextViewText(R.id.w_empty, if (payload.covers(state.selected)) context.getString(R.string.onefc_widget_empty_schedule) else "이 날짜는 앱에서 볼 수 있어요 ›")
      views.setOnClickPendingIntent(R.id.w_empty, WidgetIntents.openApp(context, dayLink, nonce))
    }
    views.setTextViewText(R.id.w_status, WidgetCommonViews.statusLine(envelope, refreshing, payload.googleNotice))
    return views
  }
}
