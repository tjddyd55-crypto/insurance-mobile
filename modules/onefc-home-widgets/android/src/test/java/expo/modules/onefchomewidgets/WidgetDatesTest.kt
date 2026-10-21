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
    // 작은 위젯: 제목 자리 없음 → 숫자 배지. 큰 위젯: 제목 2줄 + "+N".
    assertEquals(0, ScheduleWidgetRenderer.chipSlots(320, 6))
    assertEquals(2, ScheduleWidgetRenderer.chipSlots(900, 5))
    assertTrue(ScheduleWidgetRenderer.chipSlots(600, 5) >= 1)
    assertEquals(1, TodoWidgetRenderer.rows(180))
    assertEquals(5, TodoWidgetRenderer.rows(300))
    assertTrue(TodoWidgetRenderer.rows(330) >= 6)
  }

  @Test fun cellContentKeepsTotal() {
    val r = ScheduleWidgetRenderer
    // Google 2 + ONE FC 할 일 1 = 3: 제목 2 + "+1"
    val three = r.cell(3, listOf("회의", "점심", "서류"), 2)
    assertEquals(listOf("회의", "점심"), three.titles)
    assertEquals(1, three.more)
    assertEquals(3, three.titles.size + three.more)
    assertEquals(ScheduleWidgetRenderer.Cell(listOf("회의"), 0, ""), r.cell(1, listOf("회의"), 2))
    assertEquals(ScheduleWidgetRenderer.Cell(emptyList(), 0, ""), r.cell(0, emptyList(), 2))
    // 자리가 없으면 숫자 배지(9 / 10 → 9+)
    assertEquals("3", r.cell(3, listOf("a", "b", "c"), 0).badge)
    assertEquals("9", r.cell(9, List(9) { "x" }, 0).badge)
    assertEquals("9+", r.cell(10, List(10) { "x" }, 0).badge)
    val ten = r.cell(10, List(10) { "x" }, 2)
    assertEquals(10, ten.titles.size + ten.more)
  }
}
