package expo.modules.onefchomewidgets

import android.content.Context
import android.view.View
import android.widget.RemoteViews

/** ONE FC 일정: 월 헤더 한 줄 + 달력. 인스턴스 상태 = 보던 달(month) + 추가 기본 날짜(selected). */
object ScheduleWidgetRenderer : OneFcWidgetRenderer {
  override val type = OneFcWidgetType.SCHEDULE
  const val CHIP_SLOTS = 2
  /** 월 헤더 36 + 요일 20 + 패딩 20 + 상태 줄 16. */
  const val CHROME_DP = 92

  /** 칸 높이(dp). 달력이 위젯의 남은 높이를 채운다. */
  fun cellHeightDp(heightDp: Int, weeks: Int): Int = ((heightDp - CHROME_DP).coerceAtLeast(0) / weeks.coerceAtLeast(1)) - 2

  /** 칸에 넣을 제목 줄 수(0 이면 숫자 배지). 날짜 20dp, 제목 줄 15dp, "+N" 13dp. */
  fun chipSlots(heightDp: Int, weeks: Int): Int = ((cellHeightDp(heightDp, weeks) - 20 - 13) / 15).coerceIn(0, CHIP_SLOTS)

  data class Cell(val titles: List<String>, val more: Int, val badge: String)

  /** 칸 내용(순수 함수). 제목 수 + more = total. 자리가 없으면 숫자 배지(9+). */
  fun cell(total: Int, titles: List<String>, slots: Int): Cell {
    if (total <= 0) return Cell(emptyList(), 0, "")
    if (slots <= 0 || titles.isEmpty()) return Cell(emptyList(), 0, badge(total))
    val shown = titles.take(if (total > slots) slots else total).take(total)
    return Cell(shown, total - shown.size, "")
  }

  fun badge(count: Int): String = if (count <= 0) "" else if (count > 9) "9+" else count.toString()

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
    views.setContentDescription(R.id.w_month, "${WidgetDates.monthTitle(state.month)}, 앱 일정 열기")
    // 월 헤더: 앱 일정 화면(보던 날짜)으로 바로 진입. + 와 같은 openApp/deep link 경로.
    views.setOnClickPendingIntent(R.id.w_month, WidgetIntents.openApp(context, link(WidgetDeepLink.Action.OPEN, mapOf("date" to state.selected)), nonce))
    views.setOnClickPendingIntent(R.id.w_prev, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_PREV, widgetId))
    views.setOnClickPendingIntent(R.id.w_next, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_NEXT, widgetId))
    WidgetCommonViews.bindRefresh(context, views, type, widgetId)
    views.setOnClickPendingIntent(R.id.w_add, WidgetIntents.openApp(context, link(WidgetDeepLink.Action.CREATE, mapOf("date" to state.selected)), nonce))
    views.setContentDescription(R.id.w_add, "${WidgetDates.dayTitle(state.selected)} 일정 추가")

    val weeks = WidgetDates.monthGrid(state.month)
    val text = context.getColor(R.color.onefc_widget_text)
    val muted = context.getColor(R.color.onefc_widget_text_muted)
    val sunday = context.getColor(R.color.onefc_widget_sunday)
    val saturday = context.getColor(R.color.onefc_widget_saturday)
    val onBrand = context.getColor(R.color.onefc_widget_on_brand)
    val secondary = context.getColor(R.color.onefc_widget_text_secondary)
    val slots = chipSlots(heightDp, weeks.size)
    for (row in 0 until 6) {
      views.setViewVisibility(WidgetIds.WEEKS[row], if (row < weeks.size) View.VISIBLE else View.GONE)
      if (row >= weeks.size) continue
      for (col in 0 until 7) {
        val cell = weeks[row][col]
        val cellId = WidgetIds.CELLS[row][col]
        val dayId = WidgetIds.DAYS[row][col]
        val isToday = cell.ymd == today
        val total = payload.countOn(cell.ymd)
        val content = cell(total, payload.events[cell.ymd].orEmpty().filterNot { it.done }.map { it.title }, slots)
        views.setTextViewText(dayId, cell.day.toString())
        views.setTextColor(dayId, when {
          !cell.inMonth -> muted
          col == 0 -> sunday
          col == 6 -> saturday
          else -> text
        })
        views.setInt(cellId, "setBackgroundResource", if (isToday) R.drawable.onefc_widget_today else 0)
        for (slot in 0 until CHIP_SLOTS) {
          val chipId = WidgetIds.CHIPS[slot][row][col]
          val title = content.titles.getOrNull(slot)
          views.setViewVisibility(chipId, if (title != null) View.VISIBLE else View.GONE)
          if (title != null) views.setTextViewText(chipId, title)
        }
        val moreId = WidgetIds.CELL_MORE[row][col]
        views.setViewVisibility(moreId, if (content.more > 0) View.VISIBLE else View.GONE)
        if (content.more > 0) {
          views.setTextViewText(moreId, "+${content.more}")
          views.setTextColor(moreId, secondary)
        }
        val countId = WidgetIds.COUNTS[row][col]
        // 배지 칸 높이를 항상 차지(INVISIBLE)해 숫자 유무로 흔들리지 않는다.
        views.setViewVisibility(countId, if (content.badge.isNotEmpty()) View.VISIBLE else if (slots == 0) View.INVISIBLE else View.GONE)
        views.setTextViewText(countId, content.badge)
        views.setInt(countId, "setBackgroundResource", R.drawable.onefc_widget_count)
        views.setTextColor(countId, onBrand)
        val label = StringBuilder(WidgetDates.dayTitle(cell.ymd))
        if (isToday) label.append(", 오늘")
        if (total > 0) label.append(", 일정 ${total}건")
        views.setContentDescription(cellId, label.toString())
        views.setOnClickPendingIntent(cellId, WidgetIntents.openDay(context, cell.ymd))
      }
    }

    views.setTextViewText(R.id.w_status, WidgetCommonViews.statusLine(envelope, refreshing, payload.googleNotice))
    return views
  }
}

/** 선택 날짜 목록 한 줄(순수 매핑, 테스트용). */
internal object ScheduleListRows {
  /** todo=할 일 항목(일정과 아이콘 구분). time 은 부제: 시간 / 하루 종일 / 할 일. */
  data class Row(val time: String, val title: String, val done: Boolean, val link: String, val description: String, val todo: Boolean = false, val id: String = "")

  const val ALL_DAY = "하루 종일"

  fun rows(items: List<SchedulePayload.Item>, dayLink: String): List<Row> = items.map { item ->
    val todo = item.kind != "event"
    val time = when {
      item.time == "종일" -> ALL_DAY
      item.time.isNotBlank() -> item.time
      !todo -> ALL_DAY
      else -> "할 일"
    }
    Row(time, if (item.done) "✓ ${item.title}" else item.title, item.done, item.link.ifBlank { dayLink },
      listOf(time, item.title, if (item.done) "완료" else "").filter { it.isNotBlank() }.joinToString(", "), todo, item.id)
  }
}
