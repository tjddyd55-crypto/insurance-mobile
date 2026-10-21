package expo.modules.onefchomewidgets

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetEngineTest {
  private fun envelope(type: String = "schedule", version: Int = 1, extra: String = "", payload: String = "null", sync: String = "ready") =
    """{"schemaVersion":$version,"widgetType":"$type","accountKey":"u:1|ga:2","scheme":"onefc","timeZone":"Asia/Seoul",
      "generatedAt":"2026-10-21T01:00:00.000Z","lastSuccessfulSyncAt":"2026-10-21T01:00:00.000Z","authState":"signed_in",
      "syncState":"$sync","errorCode":null,"payload":$payload $extra}"""

  @Test fun registryOnlyScheduleAndTodoHaveProviders() {
    assertEquals(listOf(OneFcWidgetType.SCHEDULE, OneFcWidgetType.TODO), OneFcWidgetType.enabledTypes())
    OneFcWidgetType.values().filter { !it.enabled }.forEach { assertNull(it.providerClass) }
    assertEquals(8, OneFcWidgetType.values().size)
  }

  @Test fun cacheNamespacePerType() {
    assertEquals("widget.schedule", OneFcWidgetType.SCHEDULE.cacheKey)
    assertEquals("widget.todo", OneFcWidgetType.TODO.cacheKey)
  }

  @Test fun unknownTypeIsSafe() {
    assertNull(OneFcWidgetType.fromId("weather"))
    assertNull(WidgetEnvelope.parse(envelope(type = "weather")))
  }

  @Test fun schemaVersionAndCorruptionRejected() {
    assertNull(WidgetEnvelope.parse(envelope(version = 2)))
    assertNull(WidgetEnvelope.parse("{not json"))
    assertNull(WidgetEnvelope.parse(envelope(), OneFcWidgetType.TODO))
    assertNotNull(WidgetEnvelope.parse(envelope(), OneFcWidgetType.SCHEDULE))
  }

  @Test fun futureFieldsIgnored() {
    val payload = """{"visibleRange":{"from":"2026-09-01","to":"2026-12-31"},"calendarDays":["2026-10-21"],"events":[{"date":"2026-10-21","items":[{"id":"e1","title":"미팅","time":"10:00","kind":"event","done":false,"link":"evil://x","color":"red"}]}],"newThing":1}"""
    val parsed = WidgetEnvelope.parse(envelope(payload = payload, extra = ""","futureTop":{"a":1}"""))!!
    val schedule = SchedulePayload.parse(parsed)!!
    assertEquals("미팅", schedule.events["2026-10-21"]!![0].title)
    assertEquals("", schedule.events["2026-10-21"]!![0].link) // 다른 scheme 링크 차단
  }

  @Test fun displayStates() {
    assertEquals(WidgetDisplayState.LOGGED_OUT, WidgetDisplayState.resolve(null, "logged_out", false, false))
    assertEquals(WidgetDisplayState.LOGGED_OUT, WidgetDisplayState.resolve(null, "account_changed", false, false))
    assertEquals(WidgetDisplayState.AUTH_EXPIRED, WidgetDisplayState.resolve(null, "session_expired", false, false))
    assertEquals(WidgetDisplayState.LOADING, WidgetDisplayState.resolve(null, null, false, false))
    val error = WidgetEnvelope.parse(envelope(sync = "error"))!!
    assertEquals(WidgetDisplayState.ERROR, WidgetDisplayState.resolve(error, null, false, false))
    assertEquals(WidgetDisplayState.LOADING, WidgetDisplayState.resolve(error, null, true, false))
    val stale = WidgetEnvelope.parse(envelope(sync = "stale", payload = "{}"))!!
    assertEquals(WidgetDisplayState.OFFLINE_STALE, WidgetDisplayState.resolve(stale, null, false, true))
    assertEquals(WidgetDisplayState.READY, WidgetDisplayState.resolve(WidgetEnvelope.parse(envelope(payload = "{}"))!!, null, false, true))
  }

  @Test fun copyNeverShowsServerText() {
    assertEquals("마지막 업데이트 10:00", WidgetCopy.lastUpdated("10:00"))
    assertEquals("ONE FC에 로그인해 주세요", WidgetCopy.LOGIN_HINT)
    assertEquals("정보를 불러올 수 없습니다", WidgetCopy.LOAD_FAILED)
  }

  @Test fun deepLinks() {
    assertEquals("onefc://schedule?date=2026-10-21&src=widget&wt=schedule", WidgetDeepLink.build("onefc", OneFcWidgetType.SCHEDULE, WidgetDeepLink.Action.OPEN, mapOf("date" to "2026-10-21")))
    assertEquals("onefc://schedule?date=2026-10-21&create=1&src=widget&wt=schedule", WidgetDeepLink.build("onefc", OneFcWidgetType.SCHEDULE, WidgetDeepLink.Action.CREATE, mapOf("date" to "2026-10-21")))
    assertEquals("onefc://todos/new?dueDate=2026-10-21&src=widget&wt=todo", WidgetDeepLink.build("onefc", OneFcWidgetType.TODO, WidgetDeepLink.Action.CREATE, mapOf("date" to "2026-10-21")))
    assertNull(WidgetDeepLink.build("onefc", OneFcWidgetType.CLAIMS, WidgetDeepLink.Action.OPEN))
    assertFalse(WidgetDeepLink.build("onefc", OneFcWidgetType.TODO, WidgetDeepLink.Action.OPEN)!!.contains("token"))
  }

  @Test fun scheduleNavigationMatchesApp() {
    val today = "2026-10-21"
    val s = ScheduleWidgetRenderer.State("2026-10-01", today)
    assertEquals(ScheduleWidgetRenderer.State("2026-11-01", "2026-11-01"), ScheduleWidgetRenderer.next(s, WidgetIntents.ACTION_NEXT, null, today))
    assertEquals(ScheduleWidgetRenderer.State("2026-10-01", today), ScheduleWidgetRenderer.next(ScheduleWidgetRenderer.State("2026-11-01", "2026-11-05"), WidgetIntents.ACTION_PREV, null, today))
    assertNull(ScheduleWidgetRenderer.next(s, WidgetIntents.ACTION_SELECT, "bad", today))
    assertEquals("2026-10-20", TodoWidgetRenderer.next(today, WidgetIntents.ACTION_PREV, today))
    assertTrue(TodoWidgetRenderer.next(today, "unknown", today) == null)
  }
}
