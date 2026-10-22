package expo.modules.onefchomewidgets

/**
 * 날짜 다이얼로그에 그릴 내용. 캐시 봉투만 읽고 토큰·네트워크는 다루지 않는다.
 * RemoteViews 는 모달을 못 띄우므로 Activity 가 이 결과를 보여 준다.
 */
internal object ScheduleDayModel {
  enum class Mode { LIST, EMPTY, OUT_OF_RANGE, LOGIN, PREPARE }

  data class Content(
    val mode: Mode,
    val title: String,
    val rows: List<ScheduleListRows.Row>,
    val addLink: String?,
    val openLink: String?,
    /** 머리글 큰 숫자("23")와 요일("금요일"), 추가 버튼용 "10월 23일". 로그인 모드는 비어 있다. */
    val dayNumber: String = "",
    val weekday: String = "",
    val monthDay: String = "",
  )

  private val LOGIN_REASONS = setOf("logged_out", "session_expired", "account_changed")

  fun needsLogin(envelope: WidgetEnvelope?, clearReason: String?): Boolean {
    if (envelope == null) return clearReason in LOGIN_REASONS
    return envelope.authState == "signed_out" || envelope.authState == "expired"
  }

  fun content(envelope: WidgetEnvelope?, clearReason: String?, date: String): Content = withHeader(rawContent(envelope, clearReason, date), date)

  private fun rawContent(envelope: WidgetEnvelope?, clearReason: String?, date: String): Content {
    val title = if (WidgetDates.isYmd(date)) WidgetDates.dayTitle(date) else ""
    if (needsLogin(envelope, clearReason)) return Content(Mode.LOGIN, WidgetCopy.LOGIN_REQUIRED, emptyList(), null, openLink(envelope?.scheme, date))
    val payload = envelope?.let { SchedulePayload.parse(it) }
    if (envelope == null || payload == null) return Content(Mode.PREPARE, title, emptyList(), null, openLink(envelope?.scheme, date))
    return fromPayload(envelope.scheme, payload, date, title)
  }

  /** 다이얼로그 머리글·추가 버튼 문구를 붙인다. 로그인 모드는 날짜 대신 안내만 보인다. */
  fun withHeader(content: Content, date: String): Content {
    if (content.mode == Mode.LOGIN || !WidgetDates.isYmd(date)) return content
    return content.copy(dayNumber = date.substring(8, 10).toInt().toString(), weekday = WidgetDates.weekdayName(date), monthDay = WidgetDates.monthDay(date))
  }

  private fun fromPayload(scheme: String, payload: SchedulePayload, date: String, title: String): Content {
    val add = WidgetDeepLink.build(scheme, OneFcWidgetType.SCHEDULE, WidgetDeepLink.Action.CREATE, mapOf("date" to date))
    val open = openLink(scheme, date)
    if (!payload.covers(date)) return Content(Mode.OUT_OF_RANGE, title, emptyList(), add, open)
    val rows = ScheduleListRows.rows(payload.events[date].orEmpty(), open ?: "")
    return Content(if (rows.isEmpty()) Mode.EMPTY else Mode.LIST, title, rows, add, open)
  }

  private fun openLink(scheme: String?, date: String): String? {
    if (scheme.isNullOrBlank()) return null
    return WidgetDeepLink.build(scheme, OneFcWidgetType.SCHEDULE, WidgetDeepLink.Action.OPEN, mapOf("date" to date))
  }
}
