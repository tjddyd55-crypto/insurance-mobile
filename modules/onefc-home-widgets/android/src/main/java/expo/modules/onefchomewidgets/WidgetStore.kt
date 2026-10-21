package expo.modules.onefchomewidgets

import android.content.Context
import android.content.SharedPreferences

/**
 * 위젯 캐시·위젯별 상태. 앱 전용(MODE_PRIVATE) SharedPreferences, 백업 제외 대상 아님에 유의:
 * 내용은 제목·시각·id·완료 여부·앱 링크뿐이며 토큰·연락처·상담 내용은 없다.
 */
object WidgetStore {
  private const val PREFS = "onefc_home_widgets_v1"
  private const val KEY_SNAPSHOT = "snapshot"
  private const val KEY_SCHEME = "scheme"
  private const val KEY_CLEAR_REASON = "clear_reason"
  private const val KEY_REFRESHING_SINCE = "refreshing_since"
  private const val KEY_LAST_MANUAL = "last_manual_refresh"
  const val REFRESH_COOLDOWN_MS = 30_000L
  const val REFRESHING_MAX_MS = 60_000L

  @Volatile private var cachedRaw: String? = null
  @Volatile private var cachedSnapshot: WidgetSnapshot? = null

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Synchronized
  fun snapshot(context: Context): WidgetSnapshot? {
    val raw = prefs(context).getString(KEY_SNAPSHOT, null)
    if (raw != cachedRaw) {
      cachedRaw = raw
      cachedSnapshot = WidgetSnapshot.parse(raw)
    }
    return cachedSnapshot
  }

  fun snapshotJson(context: Context): String? = prefs(context).getString(KEY_SNAPSHOT, null)

  /** 올바른 스냅샷만 저장. 계정이 바뀌면 위젯별 상태(달·날짜)도 초기화한다. */
  @Synchronized
  fun writeSnapshot(context: Context, raw: String): Boolean {
    val parsed = WidgetSnapshot.parse(raw) ?: return false
    val previous = snapshot(context)
    val editor = prefs(context).edit()
    if (previous != null && previous.accountKey != parsed.accountKey) clearWidgetStates(editor, context)
    editor.putString(KEY_SNAPSHOT, raw).putString(KEY_SCHEME, parsed.scheme).remove(KEY_CLEAR_REASON).remove(KEY_REFRESHING_SINCE)
    val ok = editor.commit()
    cachedRaw = null
    return ok
  }

  /** 로그아웃·세션 만료·계정 변경: 개인 데이터와 위젯별 상태를 즉시 지운다. */
  @Synchronized
  fun clear(context: Context, reason: String) {
    val editor = prefs(context).edit()
    clearWidgetStates(editor, context)
    editor.remove(KEY_SNAPSHOT).remove(KEY_REFRESHING_SINCE).putString(KEY_CLEAR_REASON, reason).commit()
    cachedRaw = null
    cachedSnapshot = null
  }

  fun clearReason(context: Context): String? = prefs(context).getString(KEY_CLEAR_REASON, null)

  fun setScheme(context: Context, scheme: String) {
    prefs(context).edit().putString(KEY_SCHEME, scheme).apply()
  }

  fun scheme(context: Context): String? = prefs(context).getString(KEY_SCHEME, null)

  // ---------- 새로고침 상태 ----------

  /** 수동 새로고침 간격 제한. true 면 이번 요청을 받아들였다. */
  @Synchronized
  fun tryBeginManualRefresh(context: Context, nowMs: Long = System.currentTimeMillis()): Boolean {
    val last = prefs(context).getLong(KEY_LAST_MANUAL, 0)
    if (nowMs >= last && nowMs - last < REFRESH_COOLDOWN_MS) return false
    prefs(context).edit().putLong(KEY_LAST_MANUAL, nowMs).putLong(KEY_REFRESHING_SINCE, nowMs).commit()
    return true
  }

  fun markRefreshing(context: Context, nowMs: Long = System.currentTimeMillis()) {
    prefs(context).edit().putLong(KEY_REFRESHING_SINCE, nowMs).apply()
  }

  fun clearRefreshing(context: Context) {
    prefs(context).edit().remove(KEY_REFRESHING_SINCE).commit()
  }

  fun isRefreshing(context: Context, nowMs: Long = System.currentTimeMillis()): Boolean {
    val since = prefs(context).getLong(KEY_REFRESHING_SINCE, 0)
    return since > 0 && nowMs - since in 0 until REFRESHING_MAX_MS
  }

  // ---------- 위젯별 상태(appWidgetId) ----------
  // 정책: 저장한 날의 "오늘"이 지나면(자정·재부팅 후 날짜 변경) 오늘로 돌아간다. 재부팅·앱 업데이트 때 모두 초기화.

  data class State(val month: String, val selected: String)

  fun scheduleState(context: Context, widgetId: Int, today: String): State {
    val p = prefs(context)
    val anchor = p.getString("s.$widgetId.anchor", null)
    val month = p.getString("s.$widgetId.month", null)
    val selected = p.getString("s.$widgetId.selected", null)
    if (anchor != today || !WidgetDates.isYmd(month) || !WidgetDates.isYmd(selected)) {
      return State(WidgetDates.monthStart(today), today)
    }
    return State(month!!, selected!!)
  }

  fun saveScheduleState(context: Context, widgetId: Int, today: String, state: State) {
    prefs(context).edit()
      .putString("s.$widgetId.anchor", today)
      .putString("s.$widgetId.month", state.month)
      .putString("s.$widgetId.selected", state.selected)
      .apply()
  }

  fun todoDate(context: Context, widgetId: Int, today: String): String {
    val p = prefs(context)
    val anchor = p.getString("t.$widgetId.anchor", null)
    val date = p.getString("t.$widgetId.date", null)
    return if (anchor == today && WidgetDates.isYmd(date)) date!! else today
  }

  fun saveTodoDate(context: Context, widgetId: Int, today: String, date: String) {
    prefs(context).edit().putString("t.$widgetId.anchor", today).putString("t.$widgetId.date", date).apply()
  }

  fun removeWidget(context: Context, widgetId: Int) {
    prefs(context).edit()
      .remove("s.$widgetId.anchor").remove("s.$widgetId.month").remove("s.$widgetId.selected")
      .remove("t.$widgetId.anchor").remove("t.$widgetId.date")
      .apply()
  }

  fun resetAllWidgetStates(context: Context) {
    val editor = prefs(context).edit()
    clearWidgetStates(editor, context)
    editor.remove(KEY_REFRESHING_SINCE).commit()
  }

  private fun clearWidgetStates(editor: SharedPreferences.Editor, context: Context) {
    for (key in prefs(context).all.keys) {
      if (key.startsWith("s.") || key.startsWith("t.")) editor.remove(key)
    }
  }
}
