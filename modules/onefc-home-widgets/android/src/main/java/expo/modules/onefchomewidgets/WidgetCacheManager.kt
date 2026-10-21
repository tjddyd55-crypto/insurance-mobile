package expo.modules.onefchomewidgets

import android.content.Context
import android.content.SharedPreferences

/**
 * 공통 캐시 관리자. 앱 전용(MODE_PRIVATE) 저장소에 위젯 종류별 봉투(widget.<type>)와
 * 위젯 인스턴스 상태(inst.<type>.<appWidgetId>.<field>)를 둔다. 토큰·연락처·상담 내용은 없다.
 */
object WidgetCacheManager {
  private const val PREFS = "onefc_widget_engine"
  private const val LEGACY_PREFS = "onefc_home_widgets_v1"
  private const val KEY_SCHEMA = "meta.schema"
  private const val KEY_SCHEME = "meta.scheme"
  private const val KEY_CLEAR_REASON = "meta.clearReason"
  private const val REFRESHING_MAX_MS = 60_000L

  private val parsed = HashMap<String, Pair<String, WidgetEnvelope?>>()

  private fun prefs(context: Context): SharedPreferences {
    val app = context.applicationContext
    val prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    migrate(app, prefs)
    return prefs
  }

  /** 엔진 스키마가 다르면 전부 지우고(다음 갱신에서 다시 만든다) 버전을 기록한다. 이전 PR 빌드 저장소도 지운다. */
  @Synchronized
  private fun migrate(context: Context, prefs: SharedPreferences) {
    if (prefs.getInt(KEY_SCHEMA, -1) == WidgetEnvelope.SCHEMA_VERSION) return
    prefs.edit().clear().putInt(KEY_SCHEMA, WidgetEnvelope.SCHEMA_VERSION).commit()
    context.getSharedPreferences(LEGACY_PREFS, Context.MODE_PRIVATE).edit().clear().commit()
    parsed.clear()
  }

  // ---------- 봉투 ----------

  /** 깨졌거나 버전이 다르면 그 키를 지우고 null + needsRegenerate. */
  @Synchronized
  fun read(context: Context, type: OneFcWidgetType): WidgetEnvelope? {
    val p = prefs(context)
    val raw = p.getString(type.cacheKey, null) ?: return null
    parsed[type.cacheKey]?.let { if (it.first == raw) return it.second }
    val envelope = WidgetEnvelope.parse(raw, type)
    if (envelope == null) {
      p.edit().remove(type.cacheKey).commit()
      parsed.remove(type.cacheKey)
      return null
    }
    parsed[type.cacheKey] = raw to envelope
    return envelope
  }

  fun readRaw(context: Context, type: OneFcWidgetType): String? = prefs(context).getString(type.cacheKey, null)

  /** 켜진 종류의 올바른 봉투만 저장. 다른 계정 데이터가 있으면 먼저 전부 지운다(계정 격리). */
  @Synchronized
  fun write(context: Context, type: OneFcWidgetType, raw: String): Boolean {
    if (!type.enabled) return false
    val envelope = WidgetEnvelope.parse(raw, type) ?: return false
    val p = prefs(context)
    val editor = p.edit()
    val foreign = OneFcWidgetType.values().any { other -> read(context, other)?.let { it.accountKey != envelope.accountKey } == true }
    if (foreign) clearEverything(p, editor)
    editor.putString(type.cacheKey, raw).putString(KEY_SCHEME, envelope.scheme).remove(KEY_CLEAR_REASON).remove(refreshingKey(type))
    val ok = editor.commit()
    parsed.clear()
    return ok
  }

  /** 로그아웃·만료·계정 변경·스키마 초기화: Registry 의 모든 종류 캐시와 인스턴스 상태를 지운다. */
  @Synchronized
  fun clearAll(context: Context, reason: String) {
    val p = prefs(context)
    val editor = p.edit()
    clearEverything(p, editor)
    editor.putString(KEY_CLEAR_REASON, reason).commit()
    parsed.clear()
  }

  private fun clearEverything(p: SharedPreferences, editor: SharedPreferences.Editor) {
    for (key in p.all.keys) {
      if (key.startsWith("widget.") || key.startsWith("inst.") || key.startsWith("meta.refreshing.")) editor.remove(key)
    }
  }

  fun clearReason(context: Context): String? = prefs(context).getString(KEY_CLEAR_REASON, null)

  fun setScheme(context: Context, scheme: String) {
    prefs(context).edit().putString(KEY_SCHEME, scheme).apply()
  }

  // ---------- 새로고침 상태 ----------

  private fun refreshingKey(type: OneFcWidgetType) = "meta.refreshing.${type.id}"
  private fun manualKey(type: OneFcWidgetType) = "meta.lastManual.${type.id}"

  @Synchronized
  fun tryBeginManualRefresh(context: Context, type: OneFcWidgetType, nowMs: Long = System.currentTimeMillis()): Boolean {
    val p = prefs(context)
    val last = p.getLong(manualKey(type), 0)
    if (nowMs >= last && nowMs - last < type.manualCooldownMs) return false
    p.edit().putLong(manualKey(type), nowMs).putLong(refreshingKey(type), nowMs).commit()
    return true
  }

  fun markRefreshing(context: Context, types: Collection<OneFcWidgetType>, nowMs: Long = System.currentTimeMillis()) {
    val editor = prefs(context).edit()
    types.forEach { editor.putLong(refreshingKey(it), nowMs) }
    editor.apply()
  }

  fun clearRefreshing(context: Context, types: Collection<OneFcWidgetType>) {
    val editor = prefs(context).edit()
    types.forEach { editor.remove(refreshingKey(it)) }
    editor.commit()
  }

  fun isRefreshing(context: Context, type: OneFcWidgetType, nowMs: Long = System.currentTimeMillis()): Boolean {
    val since = prefs(context).getLong(refreshingKey(type), 0)
    return since > 0 && nowMs - since in 0 until REFRESHING_MAX_MS
  }

  // ---------- 인스턴스 상태(appWidgetId) ----------
  // 정책: 저장한 날의 "오늘"이 지나면(자정) 기본값(오늘)으로. 재부팅·앱 업데이트 때 전부 초기화. 위젯 삭제 시 정리.

  private fun instKey(type: OneFcWidgetType, widgetId: Int, field: String) = "inst.${type.id}.$widgetId.$field"

  fun instanceValue(context: Context, type: OneFcWidgetType, widgetId: Int, field: String, today: String): String? {
    val p = prefs(context)
    if (p.getString(instKey(type, widgetId, "anchor"), null) != today) return null
    return p.getString(instKey(type, widgetId, field), null)
  }

  fun saveInstance(context: Context, type: OneFcWidgetType, widgetId: Int, today: String, values: Map<String, String>) {
    val editor = prefs(context).edit().putString(instKey(type, widgetId, "anchor"), today)
    values.forEach { (field, value) -> editor.putString(instKey(type, widgetId, field), value) }
    editor.apply()
  }

  fun removeInstance(context: Context, type: OneFcWidgetType, widgetId: Int) {
    val p = prefs(context)
    val prefix = "inst.${type.id}.$widgetId."
    val editor = p.edit()
    p.all.keys.filter { it.startsWith(prefix) }.forEach(editor::remove)
    editor.apply()
  }

  fun resetAllInstances(context: Context) {
    val p = prefs(context)
    val editor = p.edit()
    p.all.keys.filter { it.startsWith("inst.") || it.startsWith("meta.refreshing.") }.forEach(editor::remove)
    editor.commit()
  }
}
