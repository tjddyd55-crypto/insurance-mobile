package expo.modules.onefchomewidgets

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

/** P2-1 / P2-2: 할 일 위젯 + 기본 날짜, 전송 버튼 접근성 라벨. */
class WidgetP2EntryTest {
  @Test fun headerAddKeepsToday() {
    assertEquals("2026-10-27", TodoWidgetRenderer.addDate(TodoWidgetRenderer.AddSlot.HEADER, "2026-11-03", "2026-10-27"))
  }

  @Test fun emptyAddUsesViewedDate() {
    assertEquals("2026-11-03", TodoWidgetRenderer.addDate(TodoWidgetRenderer.AddSlot.EMPTY, "2026-11-03", "2026-10-27"))
    assertEquals("2026-10-27", TodoWidgetRenderer.addDate(TodoWidgetRenderer.AddSlot.EMPTY, "bad", "2026-10-27"))
  }

  @Test fun emptyAndHeaderIntentsStayDistinctPerDate() {
    assertNotEquals(
      ScheduleDayActivity.requestCode("2026-11-03", ScheduleDayActivity.MODE_CREATE_TODO),
      ScheduleDayActivity.requestCode("2026-10-27", ScheduleDayActivity.MODE_CREATE_TODO),
    )
  }

  @Test fun sendDescriptionPerMode() {
    assertEquals(R.string.onefc_widget_day_send_todo, ScheduleDayActivity.sendDescription(ScheduleDayActivity.MODE_CREATE_TODO))
    assertEquals(R.string.onefc_widget_day_send, ScheduleDayActivity.sendDescription(ScheduleDayActivity.MODE_CREATE_EVENT))
    assertEquals(R.string.onefc_widget_day_send, ScheduleDayActivity.sendDescription(ScheduleDayActivity.MODE_DAY))
  }
}
