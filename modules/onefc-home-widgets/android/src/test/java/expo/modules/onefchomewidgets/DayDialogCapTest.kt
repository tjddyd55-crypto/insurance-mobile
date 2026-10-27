package expo.modules.onefchomewidgets

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** P1-2: 일정 9개+ 에서도 입력 줄/저장은 키보드·내비 바 위, 목록만 스크롤. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "ko-rKR-w360dp-h800dp-xhdpi")
class DayDialogCapTest {
  private val ctx: Context = ApplicationProvider.getApplicationContext()

  @Test fun floatingWindowZeroInsetsUsesVisibleFrame() {
    // 기기 재현: 다이얼로그 창 인셋 0, 실제 보이는 영역은 키보드로 900px.
    assertEquals(900 - 64, DayDialogCap.cap(1600, 0, 0, 900, 32))
    // 인셋이 정상으로 오면 같은 값(이중 차감 없음).
    assertEquals(900 - 64, DayDialogCap.cap(1600, 60, 640, 900, 32))
    // 미측정 frame 은 인셋 계산.
    assertEquals(1600 - 60 - 96 - 64, DayDialogCap.cap(1600, 60, 96, 0, 32))
    assertEquals(0, DayDialogCap.cap(100, 60, 96, 0, 32))
  }

  private fun layoutCard(rows: Int, cap: Int): View {
    val card = LayoutInflater.from(ctx).inflate(R.layout.onefc_day_dialog, FrameLayout(ctx), false) as LinearLayout
    card.findViewById<View>(R.id.day_create_opts).visibility = View.VISIBLE
    val list = card.findViewById<LinearLayout>(R.id.day_rows)
    repeat(rows) { i ->
      val row = LayoutInflater.from(ctx).inflate(R.layout.onefc_day_row, list, false)
      row.findViewById<TextView>(R.id.day_row_time)?.text = "10:00"
      list.addView(row)
    }
    val width = View.MeasureSpec.makeMeasureSpec(ctx.resources.displayMetrics.widthPixels, View.MeasureSpec.EXACTLY)
    card.measure(width, View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
    val natural = card.measuredHeight
    val height = if (natural > cap) cap else natural
    card.layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, height)
    card.measure(width, View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY))
    card.layout(0, 0, card.measuredWidth, card.measuredHeight)
    return card
  }

  private fun assertInputVisible(card: View, cap: Int) {
    val input = card.findViewById<View>(R.id.day_input_row)
    val scroll = card.findViewById<View>(R.id.day_scroll)
    assertTrue("card ${card.height} <= cap $cap", card.height <= cap)
    assertTrue("input bottom ${input.bottom} within card ${card.height - card.paddingBottom}", input.bottom <= card.height - card.paddingBottom)
    assertTrue("input fully sized", input.height > 0)
    assertTrue("list keeps some room", scroll.height > 0)
  }

  @Test fun tenPlusRowsKeyboardClosedAndOpen() {
    val d = ctx.resources.displayMetrics.density
    val screen = ctx.resources.displayMetrics.heightPixels
    val margin = (16 * d).toInt()
    for (rows in listOf(10, 12, 20)) {
      val closed = DayDialogCap.cap(screen, (24 * d).toInt(), (48 * d).toInt(), 0, margin)
      assertInputVisible(layoutCard(rows, closed), closed)
      val open = DayDialogCap.cap(screen, 0, 0, screen - (300 * d).toInt(), margin) // 키보드 300dp, 창 인셋 0
      assertInputVisible(layoutCard(rows, open), open)
    }
  }

  @Test fun todoEmptyAddIsAccessibleButton() {
    val root = LayoutInflater.from(ctx).inflate(R.layout.onefc_widget_todo, FrameLayout(ctx), false)
    val add = root.findViewById<View>(R.id.w_empty_add)
    assertEquals("할 일 추가", add.contentDescription?.toString())
    assertEquals(View.IMPORTANT_FOR_ACCESSIBILITY_YES, add.importantForAccessibility)
    assertTrue(add.isClickable && add.isFocusable)
  }

  /** P2-1: TalkBack '오늘로, 버튼' — RemoteViews 허용 클래스 android.widget.Button, 라벨·크기 유지. */
  @Test fun todoToTodayIsButtonRole() {
    val root = LayoutInflater.from(ctx).inflate(R.layout.onefc_widget_todo, FrameLayout(ctx), false)
    val today = root.findViewById<View>(R.id.w_to_today)
    assertTrue(today is android.widget.Button)
    assertEquals("android.widget.Button", today.accessibilityClassName.toString())
    assertEquals("오늘로", today.contentDescription?.toString())
    assertEquals("오늘로", (today as TextView).text.toString())
    assertTrue(today.isClickable && today.isFocusable)
    assertEquals(0, today.minimumHeight)
    assertEquals(0, today.minimumWidth)
  }
}
