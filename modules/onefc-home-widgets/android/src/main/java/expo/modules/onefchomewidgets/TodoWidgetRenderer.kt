package expo.modules.onefchomewidgets

import android.content.Context
import android.view.View
import android.widget.RemoteViews

/** ONE FC 할 일: 날짜별 목록. 인스턴스 상태 = 선택 날짜(date). */
object TodoWidgetRenderer : OneFcWidgetRenderer {
  override val type = OneFcWidgetType.TODO
  const val MAX_ROWS = 8

  const val OUT_OF_RANGE_TEXT = "이 날짜는 앱에서 볼 수 있어요"

  enum class EmptyState { NO_TODOS, OUT_OF_RANGE }

  /** 목록이 비었을 때: 조회 범위 안이면 "할 일 없음", 밖이면 "앱에서 확인"(일정 위젯과 같은 규칙). */
  fun emptyState(payload: TodoPayload, date: String): EmptyState = if (payload.covers(date)) EmptyState.NO_TODOS else EmptyState.OUT_OF_RANGE

  /**
   * 보이는 행 수. 헤더 32 + 날짜 32 + 패딩 20 + 상태 24 = 108, 더보기 22, 행 32(15sp).
   * 집계와 무관하고, 작은 위젯에서 글자가 겹치지 않게 행을 줄인다.
   */
  fun rows(heightDp: Int): Int = ((heightDp - 108 - 22) / 32).coerceIn(1, MAX_ROWS)

  fun date(context: Context, widgetId: Int, today: String): String =
    WidgetCacheManager.instanceValue(context, type, widgetId, "date", today)?.takeIf { WidgetDates.isYmd(it) } ?: today

  enum class AddSlot { HEADER, EMPTY }

  /** + 기본 날짜: 헤더 +는 날짜 context가 없어 오늘, 빈 상태 +는 보고 있던 날짜. */
  fun addDate(slot: AddSlot, viewed: String, today: String): String = when (slot) {
    AddSlot.HEADER -> today
    AddSlot.EMPTY -> viewed.takeIf { WidgetDates.isYmd(it) } ?: today
  }

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
    // 날짜 라벨: 그 날의 Native 날짜 모달(일정 위젯과 같은 day 모드). 헤더는 앱 할 일 그대로.
    views.setOnClickPendingIntent(R.id.w_day_label, WidgetIntents.openDay(context, date))
    // 헤더 "ONE FC 할 일": 앱 할 일 목록으로 바로 진입.
    views.setOnClickPendingIntent(R.id.w_title, WidgetIntents.openApp(context, listLink, nonce))
    views.setOnClickPendingIntent(R.id.w_prev, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_PREV, widgetId))
    views.setOnClickPendingIntent(R.id.w_next, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_NEXT, widgetId))
    views.setOnClickPendingIntent(R.id.w_to_today, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_TODAY, widgetId))
    views.setViewVisibility(R.id.w_to_today, if (date == today) View.GONE else View.VISIBLE)
    WidgetCommonViews.bindRefresh(context, views, type, widgetId)
    // 헤더 +: Native 빠른 입력(날짜 context 없음 → 오늘 기본, 날짜만 변경 가능, 시간 없음).
    val addIntent = WidgetIntents.openDay(context, addDate(AddSlot.HEADER, date, today), ScheduleDayActivity.MODE_CREATE_TODO)
    views.setOnClickPendingIntent(R.id.w_add, addIntent)
    views.setContentDescription(R.id.w_add, "할 일 추가")
    // 빈 상태 +: 지금 보고 있는 날짜(예: 11/3)를 기본값으로.
    val emptyAddIntent = WidgetIntents.openDay(context, addDate(AddSlot.EMPTY, date, today), ScheduleDayActivity.MODE_CREATE_TODO)
    views.setOnClickPendingIntent(R.id.w_empty_add, emptyAddIntent)
    views.setContentDescription(R.id.w_empty_add, context.getString(R.string.onefc_widget_add_todo))

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
    if (items.isEmpty()) {
      val state = emptyState(payload, date)
      if (state == EmptyState.OUT_OF_RANGE) {
        // 위젯 캐시가 조회하지 않은 날짜: 할 일이 없다고 단정하지 않고 앱에서 확인하도록.
        views.setTextViewText(R.id.w_empty_text, OUT_OF_RANGE_TEXT)
        views.setTextViewText(R.id.w_empty_add, context.getString(R.string.onefc_widget_empty_todo_add))
      } else {
        views.setTextViewText(R.id.w_empty_text, context.getString(R.string.onefc_widget_empty_todo))
        views.setTextViewText(R.id.w_empty_add, context.getString(R.string.onefc_widget_empty_todo_add))
      }
    }
    views.setTextViewText(R.id.w_status, WidgetCommonViews.statusLine(envelope, refreshing, null))
    return views
  }
}
