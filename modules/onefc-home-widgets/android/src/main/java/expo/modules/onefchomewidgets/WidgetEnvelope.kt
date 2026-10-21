package expo.modules.onefchomewidgets

import org.json.JSONObject

/** JS engine/widgetEnvelope.ts 와 같은 공통 봉투. 깨졌거나 버전·종류가 다르면 null. 모르는 필드는 무시(앞으로의 확장 호환). */
data class WidgetEnvelope(
  val widgetType: OneFcWidgetType,
  val accountKey: String,
  val scheme: String,
  val timeZone: String,
  val generatedAtMs: Long,
  val lastSuccessfulSyncAtMs: Long,
  val authState: String,
  val syncState: String,
  val errorCode: String?,
  val payload: JSONObject?,
) {
  companion object {
    const val SCHEMA_VERSION = 1
    private val SCHEME = Regex("^[a-z][a-z0-9+.-]*$")

    fun parse(raw: String?, expected: OneFcWidgetType? = null): WidgetEnvelope? {
      if (raw.isNullOrBlank()) return null
      return try {
        val root = JSONObject(raw)
        if (root.optInt("schemaVersion", -1) != SCHEMA_VERSION) return null
        val type = OneFcWidgetType.fromId(root.optString("widgetType")) ?: return null
        if (expected != null && type != expected) return null
        val scheme = root.optString("scheme")
        val accountKey = root.optString("accountKey")
        if (!SCHEME.matches(scheme) || accountKey.isBlank()) return null
        WidgetEnvelope(
          widgetType = type,
          accountKey = accountKey,
          scheme = scheme,
          timeZone = root.optString("timeZone"),
          generatedAtMs = parseIso(root.optString("generatedAt")),
          lastSuccessfulSyncAtMs = if (root.isNull("lastSuccessfulSyncAt")) 0 else parseIso(root.optString("lastSuccessfulSyncAt")),
          authState = root.optString("authState", "signed_in"),
          syncState = root.optString("syncState", "ready"),
          errorCode = if (root.isNull("errorCode")) null else root.optString("errorCode"),
          payload = if (root.isNull("payload")) null else root.optJSONObject("payload"),
        )
      } catch (error: Exception) {
        null
      }
    }

    /** 앱 자신의 scheme 링크만 허용. */
    fun safeLink(link: String, scheme: String): String = if (link.startsWith("$scheme://")) link else ""

    fun parseIso(value: String?): Long {
      if (value.isNullOrBlank() || value.length < 19) return 0
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

/** 일정 payload(v1). */
data class SchedulePayload(
  val visibleFrom: String,
  val visibleTo: String,
  val calendarDays: Set<String>,
  val events: Map<String, List<Item>>,
  val googleNotice: String?,
  /** 날짜별 항목 수(앱·웹 달력과 같은 규칙). 없으면 그 날 items 수. */
  val calendarCounts: Map<String, Int> = emptyMap(),
) {
  fun countOn(ymd: String): Int = calendarCounts[ymd] ?: events[ymd]?.size ?: 0

  data class Item(val id: String, val title: String, val time: String, val kind: String, val done: Boolean, val link: String)

  fun covers(ymd: String): Boolean = ymd >= visibleFrom && ymd <= visibleTo

  companion object {
    fun parse(envelope: WidgetEnvelope): SchedulePayload? {
      val payload = envelope.payload ?: return null
      return try {
        val range = payload.optJSONObject("visibleRange") ?: JSONObject()
        val days = HashSet<String>()
        payload.optJSONArray("calendarDays")?.let { array -> for (i in 0 until array.length()) array.optString(i).takeIf { WidgetDates.isYmd(it) }?.let(days::add) }
        val events = WidgetPayloads.days(payload.optJSONArray("events")) { item ->
          Item(item.optString("id"), item.optString("title"), item.optString("time"), item.optString("kind"), item.optBoolean("done"), WidgetEnvelope.safeLink(item.optString("link"), envelope.scheme))
        }
        days.addAll(events.keys)
        val counts = HashMap<String, Int>()
        payload.optJSONObject("calendarCounts")?.let { obj ->
          for (key in obj.keys()) {
            val n = obj.optInt(key, 0)
            if (WidgetDates.isYmd(key) && n > 0) counts[key] = n
          }
        }
        SchedulePayload(
          range.optString("from"),
          range.optString("to"),
          days,
          events,
          if (payload.isNull("googleNotice")) null else payload.optString("googleNotice").ifBlank { null },
          counts,
        )
      } catch (error: Exception) {
        null
      }
    }
  }
}

/** 할 일 payload(v1). */
data class TodoPayload(val visibleFrom: String, val visibleTo: String, val todos: Map<String, List<Item>>) {
  data class Item(val id: String, val title: String, val completed: Boolean, val link: String)

  /** 캐시가 이 날짜를 조회했는지. 범위 밖이면 "할 일 없음"이 아니라 "앱에서 확인". */
  fun covers(ymd: String): Boolean = WidgetDates.isYmd(visibleFrom) && WidgetDates.isYmd(visibleTo) && ymd >= visibleFrom && ymd <= visibleTo

  companion object {
    fun parse(envelope: WidgetEnvelope): TodoPayload? {
      val payload = envelope.payload ?: return null
      return try {
        val range = payload.optJSONObject("visibleRange") ?: JSONObject()
        TodoPayload(
          range.optString("from"),
          range.optString("to"),
          WidgetPayloads.days(payload.optJSONArray("todos")) { item ->
            Item(item.optString("id"), item.optString("title"), item.optBoolean("completed"), WidgetEnvelope.safeLink(item.optString("link"), envelope.scheme))
          },
        )
      } catch (error: Exception) {
        null
      }
    }
  }
}

internal object WidgetPayloads {
  fun <T> days(array: org.json.JSONArray?, map: (JSONObject) -> T): Map<String, List<T>> {
    val out = HashMap<String, List<T>>()
    if (array == null) return out
    for (index in 0 until array.length()) {
      val day = array.optJSONObject(index) ?: continue
      val date = day.optString("date")
      if (!WidgetDates.isYmd(date)) continue
      val items = day.optJSONArray("items") ?: continue
      val list = ArrayList<T>(items.length())
      for (itemIndex in 0 until items.length()) items.optJSONObject(itemIndex)?.let { list.add(map(it)) }
      if (list.isNotEmpty()) out[date] = list
    }
    return out
  }
}
