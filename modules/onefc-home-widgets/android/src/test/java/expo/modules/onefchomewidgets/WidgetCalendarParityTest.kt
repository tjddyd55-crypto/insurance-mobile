package expo.modules.onefchomewidgets

import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.view.View
import android.widget.FrameLayout
import android.widget.TextView
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "ko-rKR-w430dp-h900dp-mdpi")
class WidgetCalendarParityTest {
  private val context = ApplicationProvider.getApplicationContext<Context>()
  private val title = "한글로 길게 이어지는 상담 일정 제목과 추가 확인 항목"
  private fun envelope() = WidgetEnvelope.parse("""{"schemaVersion":1,"widgetType":"schedule","accountKey":"fixture","scheme":"onefc-dev","timeZone":"Asia/Seoul","payload":{
    "visibleRange":{"from":"2026-08-01","to":"2026-12-31"},"includeCompleted":true,
    "colors":{"onefc_event":{"background":"#dcfce7","foreground":"#166534","border":"#16a34a"},"onefc_todo":{"background":"#ede9fe","foreground":"#5b21b6","border":"#7c3aed"},"invalid":{"background":"bad","foreground":"#ffffff","border":"#ffffff"}},
    "calendarCounts":{"2026-11-13":3},"events":[{"date":"2026-11-13","items":[
      {"id":"onefc:1","title":"$title","kind":"event","colorKey":"onefc_event","done":false},
      {"id":"todo:2","title":"완료한 할 일 제목도 그대로 표시","kind":"onefc_todo","colorKey":"onefc_todo","done":true},
      {"id":"google:3","title":"다른 일정","kind":"event","done":false}
    ]}]}}""")!!

  @Test fun largeCalendarUsesSameColorsTwoLinesAndCompletedItems() {
    val value = envelope()
    val payload = SchedulePayload.parse(value)!!
    assertFalse(payload.colors.containsKey("invalid"))
    assertEquals(3, payload.countOn("2026-11-13"))
    val id = 101
    WidgetCacheManager.saveInstance(context, OneFcWidgetType.SCHEDULE, id, WidgetDates.today(value.timeZone), mapOf("month" to "2026-11-01", "selected" to "2026-11-13"))
    for (width in listOf(360, 390, 430)) {
      val view = ScheduleWidgetRenderer.render(context, value, id, 740, false)!!.apply(context, FrameLayout(context))
      view.measure(View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(740, View.MeasureSpec.EXACTLY))
      view.layout(0, 0, width, 740)
      val first = view.findViewById<TextView>(WidgetIds.CHIPS[0][1][5])
      val second = view.findViewById<TextView>(WidgetIds.CHIPS[1][1][5])
      assertEquals(title, first.text.toString())
      assertNull(first.ellipsize)
      assertEquals(2, first.maxLines)
      assertTrue(first.lineCount <= 2)
      assertEquals(Color.parseColor("#166534"), first.currentTextColor)
      assertEquals(Color.parseColor("#5b21b6"), second.currentTextColor)
      assertTrue(second.paintFlags and Paint.STRIKE_THRU_TEXT_FLAG != 0)
      assertEquals(0.5f, view.findViewById<View>(WidgetIds.CHIP_WRAPPERS[1][1][5]).alpha, 0.001f)
      assertEquals("+1", view.findViewById<TextView>(WidgetIds.CELL_MORE[1][5]).text.toString())
      val cell = view.findViewById<View>(WidgetIds.CELLS[1][5])
      for (slot in 0..1) assertTrue(view.findViewById<View>(WidgetIds.CHIP_WRAPPERS[slot][1][5]).bottom <= cell.height)
    }
  }

  @Test fun smallerCalendarsReduceCardsBeforeShrinkingText() {
    assertEquals(0, ScheduleWidgetRenderer.chipSlots(320, 6))
    assertEquals(1, ScheduleWidgetRenderer.chipSlots(520, 6))
    assertEquals(2, ScheduleWidgetRenderer.chipSlots(740, 6))
    assertTrue(ScheduleWidgetRenderer.chipSlots(740, 6, 1.4f) < ScheduleWidgetRenderer.chipSlots(740, 6))
  }
}
