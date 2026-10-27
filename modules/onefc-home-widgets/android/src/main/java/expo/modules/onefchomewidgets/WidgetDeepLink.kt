package expo.modules.onefchomewidgets

import java.net.URLEncoder

/** JS engine/widgetDeepLink.ts 와 같은 표. 표에 없는 종류·동작은 null(앱 첫 화면). */
object WidgetDeepLink {
  enum class Action { OPEN, CREATE, EDIT }

  fun build(scheme: String, type: OneFcWidgetType, action: Action, params: Map<String, String?> = emptyMap()): String? {
    val date = params["date"]?.takeIf { WidgetDates.isYmd(it) }
    val route: Pair<String, List<Pair<String, String>>> = when (type) {
      OneFcWidgetType.SCHEDULE -> when (action) {
        Action.OPEN -> "schedule" to listOfNotNull(date?.let { "date" to it }, params["event"]?.let { "event" to it })
        Action.CREATE -> "schedule" to listOfNotNull(date?.let { "date" to it }, "create" to "1")
        Action.EDIT -> return null
      }
      OneFcWidgetType.TODO -> when (action) {
        Action.OPEN -> "todos" to emptyList()
        Action.CREATE -> "todos/new" to listOfNotNull(date?.let { "dueDate" to it })
        Action.EDIT -> "todos/${enc(params["id"] ?: return null)}/edit" to emptyList()
      }
      else -> return null
    }
    val query = (route.second + ("src" to "widget") + ("wt" to type.id)).joinToString("&") { "${it.first}=${enc(it.second)}" }
    return "$scheme://${route.first}?$query"
  }

  /**
   * 날짜 모달 로그인 버튼용: 로그인 후 같은 Native 화면(mode·date)을 다시 열도록 기존 src=widget 링크에 quick=<mode> 를 붙인다.
   * 앱(_layout AuthGate)은 이 링크를 기존 pending widget href 로 보관했다가 로그인 후 openQuickEntry 로 모달을 연다.
   */
  fun quickEntry(scheme: String, mode: String, date: String): String? {
    if (scheme.isBlank() || !WidgetDates.isYmd(date)) return null
    val todo = mode == ScheduleDayActivity.MODE_CREATE_TODO
    val type = if (todo) OneFcWidgetType.TODO else OneFcWidgetType.SCHEDULE
    val query = listOf("date" to date, "quick" to ScheduleDayActivity.normalizeMode(mode), "src" to "widget", "wt" to type.id)
      .joinToString("&") { "${it.first}=${enc(it.second)}" }
    return "$scheme://${if (todo) "todos" else "schedule"}?$query"
  }

  private fun enc(value: String): String = URLEncoder.encode(value, "UTF-8")

  /** 같은 링크를 다시 눌러도 앱이 다시 적용하도록 렌더 시각(_w)을 붙인다. */
  fun withNonce(link: String, nonce: Long): String = if (link.contains("?")) "$link&_w=$nonce" else "$link?_w=$nonce"
}
