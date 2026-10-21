package expo.modules.onefchomewidgets

import org.json.JSONObject

/** JS widgetContract.ts 와 같은 DTO. 모르는 버전·깨진 JSON 이면 null(위젯은 "앱을 열어 주세요"). */
data class WidgetSnapshot(
  val accountKey: String,
  val scheme: String,
  val timeZone: String,
  val lastUpdatedAtMs: Long,
  val scheduleFrom: String,
  val scheduleTo: String,
  val scheduleDays: Map<String, List<ScheduleItem>>,
  val googleNotice: String?,
  val todoFrom: String,
  val todoTo: String,
  val todoDays: Map<String, List<TodoItem>>,
) {
  data class ScheduleItem(val id: String, val title: String, val time: String, val kind: String, val done: Boolean, val link: String)
  data class TodoItem(val id: String, val title: String, val completed: Boolean, val link: String)

  fun scheduleCovers(ymd: String): Boolean = ymd >= scheduleFrom && ymd <= scheduleTo
  fun todoCovers(ymd: String): Boolean = ymd >= todoFrom && ymd <= todoTo

  companion object {
    const val VERSION = 1
    private val SCHEME = Regex("^[a-z][a-z0-9+.-]*$")

    fun parse(raw: String?): WidgetSnapshot? {
      if (raw.isNullOrBlank()) return null
      return try {
        val root = JSONObject(raw)
        if (root.optInt("version", -1) != VERSION) return null
        val scheme = root.optString("scheme")
        val accountKey = root.optString("accountKey")
        if (!SCHEME.matches(scheme) || accountKey.isBlank()) return null
        val schedule = root.getJSONObject("schedule")
        val todos = root.getJSONObject("todos")
        val prefix = "$scheme://"
        WidgetSnapshot(
          accountKey = accountKey,
          scheme = scheme,
          timeZone = root.optString("timeZone"),
          lastUpdatedAtMs = parseIso(root.optString("lastUpdatedAt")),
          scheduleFrom = schedule.optString("from"),
          scheduleTo = schedule.optString("to"),
          scheduleDays = days(schedule) { item ->
            ScheduleItem(item.optString("id"), item.optString("title"), item.optString("time"), item.optString("kind"), item.optBoolean("done"), safeLink(item.optString("link"), prefix))
          },
          googleNotice = schedule.optString("googleNotice").takeIf { schedule.has("googleNotice") && !schedule.isNull("googleNotice") && it.isNotBlank() },
          todoFrom = todos.optString("from"),
          todoTo = todos.optString("to"),
          todoDays = days(todos) { item ->
            TodoItem(item.optString("id"), item.optString("title"), item.optBoolean("completed"), safeLink(item.optString("link"), prefix))
          },
        )
      } catch (error: Exception) {
        null
      }
    }

    /** 앱 자신의 scheme 링크만 허용한다. */
    private fun safeLink(link: String, prefix: String): String = if (link.startsWith(prefix)) link else ""

    private fun <T> days(section: JSONObject, map: (JSONObject) -> T): Map<String, List<T>> {
      val out = HashMap<String, List<T>>()
      val array = section.optJSONArray("days") ?: return out
      for (index in 0 until array.length()) {
        val day = array.optJSONObject(index) ?: continue
        val date = day.optString("date")
        if (!WidgetDates.isYmd(date)) continue
        val items = day.optJSONArray("items") ?: continue
        val list = ArrayList<T>(items.length())
        for (itemIndex in 0 until items.length()) {
          val item = items.optJSONObject(itemIndex) ?: continue
          list.add(map(item))
        }
        if (list.isNotEmpty()) out[date] = list
      }
      return out
    }

    /** "2026-10-21T03:15:00.000Z" → epoch ms. 실패 시 0. */
    fun parseIso(value: String?): Long {
      if (value.isNullOrBlank()) return 0
      return try {
        val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.ROOT)
        format.timeZone = java.util.TimeZone.getTimeZone("UTC")
        format.parse(value.substring(0, 19))?.time ?: 0
      } catch (error: Exception) {
        0
      }
    }
  }
}
