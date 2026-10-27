package expo.modules.onefchomewidgets

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 일정·할 일 홈 위젯 공통 타이포 토큰을 고정한다(가독성 하한). 날짜 모달 토큰은 그대로여야 한다. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "ko-rKR-w360dp-h800dp-mdpi")
class WidgetTypographyTest {
  private val context = ApplicationProvider.getApplicationContext<Context>()
  private fun sp(id: Int) = context.resources.getDimension(id) / context.resources.displayMetrics.scaledDensity

  @Test fun homeWidgetTokens() {
    assertEquals(18f, sp(R.dimen.onefc_widget_header_text))
    assertEquals(13f, sp(R.dimen.onefc_widget_weekday_text))
    assertEquals(14f, sp(R.dimen.onefc_widget_day_text))
    assertEquals(11f, sp(R.dimen.onefc_widget_event_text))
    assertEquals(11f, sp(R.dimen.onefc_widget_more_text))
    assertEquals(16f, sp(R.dimen.onefc_widget_todo_text))
    assertEquals(13f, sp(R.dimen.onefc_widget_meta_text))
    assertEquals(11f, sp(R.dimen.onefc_widget_status_text))
    // 날짜 모달·로그인 메시지(이번 범위 밖)는 기존 값.
    assertEquals(17f, sp(R.dimen.onefc_widget_month_text))
    assertEquals(15f, sp(R.dimen.onefc_widget_item_text))
    assertEquals(12f, sp(R.dimen.onefc_widget_small_text))
  }

  @Test fun metaColorSitsBetweenSecondaryAndMuted() {
    fun lum(id: Int) = context.getColor(id).let { ((it shr 16) and 0xFF) + ((it shr 8) and 0xFF) + (it and 0xFF) }
    val meta = lum(R.color.onefc_widget_text_meta)
    assertTrue(meta > lum(R.color.onefc_widget_text_secondary))
    assertTrue(meta < lum(R.color.onefc_widget_text_muted))
  }
}
