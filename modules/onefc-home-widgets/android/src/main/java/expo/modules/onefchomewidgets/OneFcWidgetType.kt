package expo.modules.onefchomewidgets

/**
 * Widget Registry(native). JS engine/widgetRegistry.ts 와 같은 id.
 * enabled=false 인 종류는 provider·렌더러가 없고 manifest 에도 없다(위젯 목록에 안 나온다).
 * 새 provider 종류를 켜려면 새 바이너리가 필요하다(docs/android-widget-architecture.md).
 */
enum class OneFcWidgetType(
  val id: String,
  val enabled: Boolean,
  val providerClass: Class<*>?,
  /** 위젯 수동 새로고침 간격. */
  val manualCooldownMs: Long,
  /** WorkManager 주기(분). null = 주기 갱신 없음(데이터 없는 위젯). */
  val periodicMinutes: Long?,
  val supportsDateNavigation: Boolean,
) {
  SCHEDULE("schedule", true, ScheduleWidgetProvider::class.java, 30_000L, 30L, true),
  TODO("todo", true, TodoWidgetProvider::class.java, 30_000L, 30L, true),
  NOTIFICATIONS("notifications", false, null, 30_000L, 30L, false),
  CONSULTATION("consultation", false, null, 30_000L, 30L, false),
  CLAIMS("claims", false, null, 30_000L, 30L, false),
  CUSTOMER_SUMMARY("customerSummary", false, null, 30_000L, 30L, false),
  QUICK_ACTIONS("quickActions", false, null, 0L, null, false),
  AI_ASSISTANT("aiAssistant", false, null, 0L, null, false);

  val cacheKey: String get() = "widget.$id"

  /** 크기 정보가 없을 때 기본 높이(dp). */
  val defaultHeightDp: Int get() = if (this == TODO) 180 else 320

  companion object {
    /** 모르는 id → null(예외 없음). */
    fun fromId(id: String?): OneFcWidgetType? = values().firstOrNull { it.id == id }

    fun enabledTypes(): List<OneFcWidgetType> = values().filter { it.enabled && it.providerClass != null }
  }
}
