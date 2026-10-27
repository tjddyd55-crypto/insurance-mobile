package expo.modules.onefchomewidgets

/** 날짜 다이얼로그 카드 높이 상한(px). 순수 함수 — 단위 테스트용. */
object DayDialogCap {
  /**
   * screen − 상단 인셋 − max(내비 바, IME) 와 창의 실제 보이는 높이(visibleFrame, IME·바 이미 제외) 중 작은 값 − 위아래 여백.
   * 두 값을 더하거나 빼지 않고 min 만 취하므로 이중 보정이 없다. visibleFrame ≤ 0(미측정)이면 인셋 계산만 쓴다.
   */
  fun cap(screen: Int, insetTop: Int, insetBottom: Int, visibleFrame: Int, margin: Int): Int {
    val byInsets = screen - insetTop - insetBottom
    val available = if (visibleFrame > 0) minOf(byInsets, visibleFrame) else byInsets
    return (available - margin * 2).coerceAtLeast(0)
  }
}
