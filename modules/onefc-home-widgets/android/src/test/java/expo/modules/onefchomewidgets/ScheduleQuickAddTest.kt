package expo.modules.onefchomewidgets

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ScheduleQuickAddTest {
  @Test fun emptyOrBusyInputCannotSubmit() {
    assertFalse(ScheduleQuickAdd.canSubmit("", false))
    assertFalse(ScheduleQuickAdd.canSubmit("   ", false))
    assertFalse(ScheduleQuickAdd.canSubmit("미팅", true))
    assertFalse(ScheduleQuickAdd.canSubmit("가".repeat(201), false))
    assertTrue(ScheduleQuickAdd.canSubmit(" 미팅 ", false))
    assertEquals("미팅", ScheduleQuickAdd.normalize(" 미팅 "))
  }

  @Test fun sessionGuardsDoubleSubmitAndKeepsIdForRetry() {
    var n = 0
    val session = ScheduleQuickAdd.Session { "id${n++}" }
    val first = session.begin("2026-10-22", "미팅")
    assertEquals("id0", first)
    assertNull("double submit", session.begin("2026-10-22", "미팅"))
    assertFalse("stale result ignored", session.finish("other", false))
    assertTrue(session.finish("id0", ok = false))
    assertEquals("same text retry keeps id (server dedupes)", "id0", session.begin("2026-10-22", "미팅"))
    session.finish("id0", ok = false)
    assertEquals("edited text gets new id", "id1", session.begin("2026-10-22", "미팅2"))
    session.finish("id1", ok = true)
    assertEquals("after success new id", "id2", session.begin("2026-10-22", "미팅2"))
  }

  @Test fun requestIdIs32Hex() {
    val id = ScheduleQuickAdd.newRequestId()
    assertTrue(id, Regex("^[0-9a-f]{32}$").matches(id))
    assertNotEquals(id, ScheduleQuickAdd.newRequestId())
  }

  @Test fun parsesResults() {
    val ok = ScheduleQuickAdd.parse("""{"ok":true,"requestId":"r","eventId":"g:cal:e1","date":"2026-10-22","title":"미팅","refreshed":false}""")!!
    assertTrue(ok.ok)
    assertEquals("g:cal:e1", ok.eventId)
    val error = ScheduleQuickAdd.parse("""{"ok":false,"requestId":"r","code":"server","message":"Google 연결이 만료되었습니다."}""")!!
    assertFalse(error.ok)
    assertEquals("Google 연결이 만료되었습니다.", error.message)
    assertNull(ScheduleQuickAdd.parse(""))
    assertNull(ScheduleQuickAdd.parse("""{"ok":true,"requestId":"r"}"""))
    assertNull(ScheduleQuickAdd.parse("""{"ok":true,"eventId":"x"}"""))
  }

  @Test fun createdEventIsTappableImmediately() {
    val empty = ScheduleDayModel.Content(ScheduleDayModel.Mode.EMPTY, "10월 22일 목요일", emptyList(), "onefc://schedule?date=2026-10-22&create=1", "onefc://schedule?date=2026-10-22")
    val result = ScheduleQuickAdd.Result(true, "r", "g:cal:e1", "2026-10-22", "미팅", "", "")
    val merged = ScheduleQuickAdd.withCreated(empty, result, "onefc")
    assertEquals(ScheduleDayModel.Mode.LIST, merged.mode)
    val row = merged.rows.single()
    assertEquals("g:cal:e1", row.id)
    assertEquals("하루 종일", row.time)
    assertTrue(row.link, row.link.contains("event=g%3Acal%3Ae1") || row.link.contains("event=g:cal:e1"))
    assertTrue(row.link, row.link.contains("src=widget"))
    assertTrue(row.link, row.link.contains("date=2026-10-22"))
    // 캐시 갱신으로 이미 들어 있으면 중복으로 붙이지 않는다.
    assertEquals(1, ScheduleQuickAdd.withCreated(merged, result, "onefc").rows.size)
    // 로그인 모드에는 붙이지 않는다.
    val login = empty.copy(mode = ScheduleDayModel.Mode.LOGIN)
    assertEquals(0, ScheduleQuickAdd.withCreated(login, result, "onefc").rows.size)
  }

  @Test fun cachedAllDayLabelReadsAsAllDay() {
    val rows = ScheduleListRows.rows(listOf(SchedulePayload.Item("e", "행사", "종일", "event", false, "")), "onefc://schedule?date=2026-10-22")
    assertEquals("하루 종일", rows.single().time)
    assertEquals("e", rows.single().id)
  }
}
