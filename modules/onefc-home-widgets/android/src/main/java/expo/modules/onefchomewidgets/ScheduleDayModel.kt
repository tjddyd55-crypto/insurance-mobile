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
  )

  private val LOGIN_REASONS = setOf("logged_out", "session_expired", "account_changed")

  fun needsLogin(envelope: WidgetEnvelope?, clearReason: String?): Boolean {
    if (envelope == null) return clearReason in LOGIN_REASONS
    return envelope.authState == "signed_out" || envelope.authState == "expired"
  }

  fun content(envelope: WidgetEnvelope?, clearReason: String?, date: String): Content {
    val title = if (WidgetDates.isYmd(date)) WidgetDates.dayTitle(date) else ""
    if (needsLogin(envelope, clearReason)) return Content(Mode.LOGIN, WidgetCopy.LOGIN_REQUIRED, emptyList(), null, openLink(envelope?.scheme, date))
    val payload = envelope?.let { SchedulePayload.parse(it) }
    if (envelope == null || payload == null) return Content(Mode.PREPARE, title, emptyList(), null, openLink(envelope?.scheme, date))
    return fromPayload(envelope.scheme, payload, date, title)
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
