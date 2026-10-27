package expo.modules.onefchomewidgets

import android.content.Context
import android.content.Intent
import android.view.LayoutInflater
import android.view.View
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

/** t597u: 날짜 상세 좌우 스와이프 · 카드 좌우 대칭 · 일정 위젯 오늘 버튼. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "ko-rKR-w360dp-h800dp-xhdpi")
class WidgetDayNavTodayTest {
  private val ctx: Context = ApplicationProvider.getApplicationContext()
  private val d = 2f // xhdpi

  @Test fun swipeDirectionAndThresholds() {
    assertEquals(1, DaySwipe.direction(-200f * d, 10f, -1000f * d, d)) // 왼쪽 = 다음 날
    assertEquals(-1, DaySwipe.direction(200f * d, 10f, 1000f * d, d)) // 오른쪽 = 이전 날
    assertEquals(0, DaySwipe.direction(-40f * d, 0f, -1000f * d, d)) // 짧은 이동(탭)
    assertEquals(0, DaySwipe.direction(-120f * d, 120f * d, -1000f * d, d)) // 대각/세로 스크롤
    assertEquals(0, DaySwipe.direction(-200f * d, 0f, -100f * d, d)) // 느린 드래그
  }

  @Test fun swipeBoundaries() {
    assertEquals("2026-10-29", DaySwipe.target("2026-10-28", 1))
    assertEquals("2026-10-27", DaySwipe.target("2026-10-28", -1))
    assertEquals("2026-11-01", DaySwipe.target("2026-10-31", 1))
    assertEquals("2027-01-01", DaySwipe.target("2026-12-31", 1))
    assertEquals("2026-12-31", DaySwipe.target("2027-01-01", -1))
    assertEquals("2028-02-29", DaySwipe.target("2028-02-28", 1))
  }

  @Test fun draftProtection() {
    assertTrue(DaySwipe.allowed(ScheduleDayActivity.MODE_DAY, "", false))
    assertTrue(DaySwipe.allowed(ScheduleDayActivity.MODE_DAY, "   ", false))
    assertFalse(DaySwipe.allowed(ScheduleDayActivity.MODE_DAY, "회의", false))
    assertFalse(DaySwipe.allowed(ScheduleDayActivity.MODE_DAY, "", true))
    assertFalse(DaySwipe.allowed(ScheduleDayActivity.MODE_CREATE_EVENT, "", false))
    assertFalse(DaySwipe.allowed(ScheduleDayActivity.MODE_CREATE_TODO, "", false))
  }

  private fun activity(date: String): ScheduleDayActivity = Robolectric.buildActivity(
    ScheduleDayActivity::class.java,
    Intent().putExtra(ScheduleDayActivity.EXTRA_DATE, date),
  ).setup().get()

  @Test fun moveToSameActivityUpdatesHeaderAndNoNewActivity() {
    val a = activity("2026-10-31")
    a.moveTo(DaySwipe.target(a.currentDate, 1))
    assertEquals("2026-11-01", a.currentDate)
    assertEquals("1", a.findViewById<TextView>(R.id.day_number).text.toString())
    assertEquals(WidgetDates.weekdayName("2026-11-01"), a.findViewById<TextView>(R.id.day_title).text.toString())
    assertFalse(a.isFinishing)
    assertNull(shadowOf(a).nextStartedActivity) // push 없음 → 스택 안 쌓임
  }

  @Test fun flingOnActivityMovesDayOnlyWhenInputEmpty() {
    val a = activity("2026-10-28")
    fling(a, -1)
    assertEquals("2026-10-29", a.currentDate)
    fling(a, 1)
    assertEquals("2026-10-28", a.currentDate)
    a.findViewById<EditText>(R.id.day_input).setText("작성 중")
    fling(a, -1)
    assertEquals("2026-10-28", a.currentDate)
    assertEquals("작성 중", a.findViewById<EditText>(R.id.day_input).text.toString())
  }

  private fun fling(a: ScheduleDayActivity, sign: Int) {
    val y = 400f
    val x0 = 360f
    val t = android.os.SystemClock.uptimeMillis()
    fun ev(action: Int, x: Float, dt: Long) = android.view.MotionEvent.obtain(t, t + dt, action, x, y, 0)
    a.dispatchTouchEvent(ev(android.view.MotionEvent.ACTION_DOWN, x0, 0))
    a.dispatchTouchEvent(ev(android.view.MotionEvent.ACTION_MOVE, x0 + sign * 150f, 30))
    a.dispatchTouchEvent(ev(android.view.MotionEvent.ACTION_MOVE, x0 + sign * 300f, 60))
    a.dispatchTouchEvent(ev(android.view.MotionEvent.ACTION_UP, x0 + sign * 300f, 70))
  }

  /** | 여백 | 카드 | 여백 | 스크롤바 |: 행 좌우 여백이 같고, 스크롤바는 행 바깥(오른쪽)에 그린다. 키보드와 무관(폭 계산만). */
  @Test fun cardsSymmetricWithScrollbarOutside() {
    val card = LayoutInflater.from(ctx).inflate(R.layout.onefc_day_dialog, FrameLayout(ctx), false) as LinearLayout
    val rows = card.findViewById<LinearLayout>(R.id.day_rows)
    repeat(10) { rows.addView(LayoutInflater.from(ctx).inflate(R.layout.onefc_day_row, rows, false)) }
    val width = (360 * d).toInt()
    for (heightDp in listOf(700, 300)) { // 키보드 닫힘/열림(카드 높이 상한)
      card.measure(View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec((heightDp * d).toInt(), View.MeasureSpec.EXACTLY))
      card.layout(0, 0, card.measuredWidth, card.measuredHeight)
      val scroll = card.findViewById<ScrollView>(R.id.day_scroll)
      val row = rows.getChildAt(0)
      var left = row.left
      var node = row.parent as View
      while (node !== card) { left += node.left; node = node.parent as View }
      val right = card.width - (left + row.width)
      assertEquals(card.paddingStart, left)
      assertEquals("좌 $left / 우 $right", left, right)
      assertTrue(scroll.isVerticalScrollBarEnabled)
      assertEquals(View.SCROLLBARS_OUTSIDE_OVERLAY, scroll.scrollBarStyle)
      assertTrue("스크롤바는 행 오른쪽 바깥", scroll.right - scroll.verticalScrollbarWidth >= left + row.width)
    }
  }

  @Test fun todayButtonLabelAndRole() {
    assertEquals("27", ScheduleWidgetRenderer.todayLabel("2026-10-27"))
    assertEquals("1", ScheduleWidgetRenderer.todayLabel("2026-11-01"))
    assertEquals("오늘로 이동, 1일", ScheduleWidgetRenderer.todayDescription("2026-11-01"))
    val root = LayoutInflater.from(ctx).inflate(R.layout.onefc_widget_schedule, FrameLayout(ctx), false)
    val today = root.findViewById<View>(R.id.w_today)
    assertTrue(today is android.widget.Button)
    assertTrue(today.isClickable && today.isFocusable)
    // 기존 머리글 버튼 크기 유지(축소 없음).
    val size = { id: Int -> root.findViewById<View>(id).layoutParams.width }
    assertEquals((36 * d).toInt(), size(R.id.w_prev))
    assertEquals((36 * d).toInt(), size(R.id.w_next))
    assertEquals((32 * d).toInt(), size(R.id.w_refresh))
    assertEquals((32 * d).toInt(), size(R.id.w_add))
    assertEquals((36 * d).toInt(), size(R.id.w_today))
  }

  @Test fun todayActionReturnsToTodayMonthAndSelects() {
    val far = ScheduleWidgetRenderer.State("2027-01-01", "2027-01-01")
    val next = ScheduleWidgetRenderer.next(far, WidgetIntents.ACTION_TODAY, null, "2026-10-27")!!
    assertEquals("2026-10-01", next.month)
    assertEquals("2026-10-27", next.selected)
  }
}
