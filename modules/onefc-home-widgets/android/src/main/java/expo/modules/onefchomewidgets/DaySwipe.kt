package expo.modules.onefchomewidgets

import kotlin.math.abs

/**
 * 날짜 상세 좌우 스와이프 판정(순수 함수). 왼쪽(dx<0) = 다음 날 +1, 오른쪽(dx>0) = 이전 날 −1, 아니면 0.
 * 세로 스크롤·탭과 겹치지 않게: 수평 이동 ≥ 최소 거리(dp), 수평이 수직의 [DOMINANCE]배 이상, 수평 속도 ≥ 최소 속도(dp/s).
 * 작성 중 보호: 날짜 모드(day)이고 입력이 비어 있고 저장 중이 아닐 때만 허용(확인 창 없음, 그냥 무시).
 */
internal object DaySwipe {
  const val MIN_DISTANCE_DP = 72f
  const val MIN_VELOCITY_DP = 300f
  const val DOMINANCE = 1.5f

  fun allowed(mode: String, inputText: CharSequence?, busy: Boolean): Boolean =
    ScheduleDayActivity.normalizeMode(mode) == ScheduleDayActivity.MODE_DAY && !busy && inputText.isNullOrBlank()

  fun direction(dxPx: Float, dyPx: Float, velocityXPx: Float, density: Float): Int {
    val d = if (density > 0f) density else 1f
    if (abs(dxPx) < MIN_DISTANCE_DP * d) return 0
    if (abs(dxPx) < abs(dyPx) * DOMINANCE) return 0
    if (abs(velocityXPx) < MIN_VELOCITY_DP * d) return 0
    return if (dxPx < 0) 1 else -1
  }

  fun target(date: String, direction: Int): String = if (direction == 0) date else WidgetDates.addDays(date, direction)
}
