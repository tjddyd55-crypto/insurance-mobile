package expo.modules.onefchomewidgets

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TodoCompleteTest {
  @Test fun sessionGuardsDuplicateWhileBusyAndKeepsIdForRetry() {
    var n = 0
    val session = TodoComplete.Session { "id${n++}" }
    assertEquals("id0", session.begin("42"))
    assertNull("busy blocks second tap", session.begin("42"))
    assertNull("busy blocks other todo", session.begin("99"))
    assertFalse(session.finish("other", false))
    assertTrue(session.finish("id0", ok = false))
    assertEquals("retry same todo keeps requestId", "id0", session.begin("42"))
    session.finish("id0", ok = true)
    assertEquals("after success new id", "id1", session.begin("42"))
  }

  @Test fun emptyTodoIdRejected() {
    val session = TodoComplete.Session { "id0" }
    assertNull(session.begin(""))
    assertNull(session.begin("  "))
  }

  @Test fun requestIdIs32Hex() {
    val id = TodoComplete.newRequestId()
    assertTrue(id, Regex("^[0-9a-f]{32}$").matches(id))
    assertNotEquals(id, TodoComplete.newRequestId())
  }

  @Test fun parsesResults() {
    val ok = TodoComplete.parse("""{"ok":true,"requestId":"r","todoId":"42","refreshed":true}""")!!
    assertTrue(ok.ok)
    assertEquals("42", ok.todoId)
    val error = TodoComplete.parse("""{"ok":false,"requestId":"r","code":"network","message":"연결이 불안정해요. 다시 시도해 주세요"}""")!!
    assertFalse(error.ok)
    assertEquals("network", error.code)
    assertNull(TodoComplete.parse(""))
    assertNull(TodoComplete.parse("""{"ok":true}"""))
  }

  @Test fun touchTargetFloorAndRowHeight() {
    assertEquals(44, TodoComplete.TOUCH_MIN_DP)
    assertEquals(44, TodoWidgetRenderer.ROW_DP)
    // 행 높이 44dp: 이전 32dp 공식보다 보이는 행 수가 줄어든다.
    assertEquals(1, TodoWidgetRenderer.rows(180))
    assertEquals(3, TodoWidgetRenderer.rows(300))
    assertEquals(4, TodoWidgetRenderer.rows(330))
  }

  @Test fun completeActionConstant() {
    assertTrue(WidgetIntents.ACTION_COMPLETE_TODO.endsWith("COMPLETE_TODO"))
    assertEquals("todoId", WidgetIntents.EXTRA_TODO_ID)
  }
}
