package expo.modules.onefchomewidgets

import android.content.Context
import android.view.View
import android.widget.RemoteViews

/** ONE FC 할 일: 날짜별 목록. 인스턴스 상태 = 선택 날짜(date). */
object TodoWidgetRenderer : OneFcWidgetRenderer {
  override val type = OneFcWidgetType.TODO
  const val MAX_ROWS = 8

  fun rows(heightDp: Int): Int = ((heightDp - 106 - 22) / 26).coerceIn(1, MAX_ROWS)

  fun date(context: Context, widgetId: Int, today: String): String =
    WidgetCacheManager.instanceValue(context, type, widgetId, "date", today)?.takeIf { WidgetDates.isYmd(it) } ?: today

  fun next(current: String, action: String, today: String): String? = when (action) {
    WidgetIntents.ACTION_PREV -> WidgetDates.addDays(current, -1)
    WidgetIntents.ACTION_NEXT -> WidgetDates.addDays(current, 1)
    WidgetIntents.ACTION_TODAY -> today
    else -> null
  }

  override fun hasPayload(envelope: WidgetEnvelope) = TodoPayload.parse(envelope) != null

  override fun handleAction(context: Context, envelope: WidgetEnvelope?, widgetId: Int, action: String, date: String?): Boolean {
    val today = WidgetDates.today(envelope?.timeZone)
    val updated = next(date(context, widgetId, today), action, today) ?: return false
    WidgetCacheManager.saveInstance(context, type, widgetId, today, mapOf("date" to updated))
    return true
  }

  override fun render(context: Context, envelope: WidgetEnvelope, widgetId: Int, heightDp: Int, refreshing: Boolean): RemoteViews? {
    val payload = TodoPayload.parse(envelope) ?: return null
    val views = RemoteViews(context.packageName, R.layout.onefc_widget_todo)
    val today = WidgetDates.today(envelope.timeZone)
    val date = date(context, widgetId, today)
    val nonce = System.currentTimeMillis() / 1000
    val listLink = WidgetDeepLink.build(envelope.scheme, type, WidgetDeepLink.Action.OPEN)
    val text = context.getColor(R.color.onefc_widget_text)
    val muted = context.getColor(R.color.onefc_widget_text_muted)

    views.setTextViewText(R.id.w_day_label, WidgetDates.todoDayLabel(date, today))
    views.setOnClickPendingIntent(R.id.w_day_label, WidgetIntents.openApp(context, listLink, nonce))
    views.setOnClickPendingIntent(R.id.w_prev, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_PREV, widgetId))
    views.setOnClickPendingIntent(R.id.w_next, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_NEXT, widgetId))
    views.setOnClickPendingIntent(R.id.w_to_today, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_TODAY, widgetId))
    views.setViewVisibility(R.id.w_to_today, if (date == today) View.GONE else View.VISIBLE)
    WidgetCommonViews.bindRefresh(context, views, type, widgetId)
    val addIntent = WidgetIntents.openApp(context, WidgetDeepLink.build(envelope.scheme, type, WidgetDeepLink.Action.CREATE, mapOf("date" to date)), nonce)
    views.setOnClickPendingIntent(R.id.w_add, addIntent)
    views.setContentDescription(R.id.w_add, "${WidgetDates.dayTitle(date)} 할 일 추가")
    views.setOnClickPendingIntent(R.id.w_empty_add, addIntent)

    val items = payload.todos[date].orEmpty()
    val maxRows = rows(heightDp)
    val shown = (if (items.size > maxRows) maxRows - 1 else items.size).coerceAtLeast(0)
    for (index in 0 until MAX_ROWS) {
      val rowId = WidgetIds.TODOS[index]
      if (index >= shown) {
        views.setViewVisibility(rowId, View.GONE)
        continue
      }
      val item = items[index]
      views.setViewVisibility(rowId, View.VISIBLE)
      views.setTextViewText(WidgetIds.TODO_CHECKS[index], if (item.completed) "✓" else "○")
      views.setTextViewText(WidgetIds.TODO_TITLES[index], item.title)
      views.setTextColor(WidgetIds.TODO_TITLES[index], if (item.completed) muted else text)
      views.setContentDescription(rowId, "${item.title}, ${if (item.completed) "완료" else "미완료"}, 열기")
      views.setOnClickPendingIntent(rowId, WidgetIntents.openApp(context, item.link.ifBlank { listLink }, nonce))
    }
    val more = items.size - shown
    views.setViewVisibility(R.id.w_more, if (more > 0) View.VISIBLE else View.GONE)
    if (more > 0) {
      views.setTextViewText(R.id.w_more, "+${more}개 더보기")
      views.setOnClickPendingIntent(R.id.w_more, WidgetIntents.openApp(context, listLink, nonce))
    }
    views.setViewVisibility(R.id.w_empty_box, if (items.isEmpty()) View.VISIBLE else View.GONE)
    views.setTextViewText(R.id.w_status, WidgetCommonViews.statusLine(envelope, refreshing, null))
    return views
  }
}
