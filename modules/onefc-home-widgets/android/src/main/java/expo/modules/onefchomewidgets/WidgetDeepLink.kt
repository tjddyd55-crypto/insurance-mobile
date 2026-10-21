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

  private fun enc(value: String): String = URLEncoder.encode(value, "UTF-8")

  /** 같은 링크를 다시 눌러도 앱이 다시 적용하도록 렌더 시각(_w)을 붙인다. */
  fun withNonce(link: String, nonce: Long): String = if (link.contains("?")) "$link&_w=$nonce" else "$link?_w=$nonce"
}
