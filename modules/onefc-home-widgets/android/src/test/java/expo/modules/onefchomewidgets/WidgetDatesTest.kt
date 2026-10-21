package expo.modules.onefchomewidgets

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetDatesTest {
  @Test fun todayUsesSnapshotZoneAcrossMidnight() {
    // 2026-10-20T15:30:00Z = 2026-10-21 00:30 KST
    val ms = 1792509000000L
    assertEquals("2026-10-21", WidgetDates.today("Asia/Seoul", ms))
    assertEquals("2026-10-20", WidgetDates.today("UTC", ms))
  }

  @Test fun monthGridStartsSundayAndCoversMonth() {
    val weeks = WidgetDates.monthGrid("2026-10-01")
    assertEquals(5, weeks.size)
    assertEquals("2026-09-27", weeks[0][0].ymd)
    assertFalse(weeks[0][0].inMonth)
    assertTrue(weeks[0][4].inMonth)
    assertEquals("2026-10-01", weeks[0][4].ymd)
    assertEquals(6, WidgetDates.monthGrid("2026-08-01").size)
  }

  @Test fun shiftMonthAndDaysAcrossYear() {
    assertEquals("2027-01-01", WidgetDates.shiftMonth("2026-12-15", 1))
    assertEquals("2026-11-30", WidgetDates.shiftMonth("2027-01-01", -2).let { WidgetDates.monthEnd(it) })
    assertEquals("2027-01-01", WidgetDates.addDays("2026-12-31", 1))
    assertEquals("2028-02-29", WidgetDates.addDays("2028-02-28", 1))
  }

  @Test fun todoLabels() {
    assertEquals("오늘 · 10월 21일", WidgetDates.todoDayLabel("2026-10-21", "2026-10-21"))
    assertEquals("내일 · 10월 22일", WidgetDates.todoDayLabel("2026-10-22", "2026-10-21"))
    assertEquals("모레 · 10월 23일", WidgetDates.todoDayLabel("2026-10-23", "2026-10-21"))
    assertEquals("10월 24일 토요일", WidgetDates.todoDayLabel("2026-10-24", "2026-10-21"))
    assertEquals("10월 20일 화요일", WidgetDates.todoDayLabel("2026-10-20", "2026-10-21"))
  }

  @Test fun validatesYmd() {
    assertTrue(WidgetDates.isYmd("2026-02-28"))
    assertFalse(WidgetDates.isYmd("2026-02-30"))
    assertFalse(WidgetDates.isYmd("2026-2-3"))
    assertFalse(WidgetDates.isYmd(null))
  }

  @Test fun monthTitle() {
    assertEquals("2026년 10월", WidgetDates.monthTitle("2026-10-01"))
  }

  @Test fun rowsBySize() {
    assertEquals(1, WidgetRenderer.scheduleRows(250, 6))
    assertEquals(3, WidgetRenderer.scheduleRows(380, 5))
    assertTrue(WidgetRenderer.scheduleRows(480, 5) >= 5)
    assertEquals(8, WidgetRenderer.scheduleRows(900, 6))
    assertEquals(2, WidgetRenderer.todoRows(180))
    assertTrue(WidgetRenderer.todoRows(300) >= 6)
  }
}
