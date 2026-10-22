package expo.modules.onefchomewidgets

import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/** 날짜 문자열(YYYY-MM-DD) 계산. minSdk 24 라 java.time 대신 Calendar(UTC 기준 날짜 산술)를 쓴다. */
object WidgetDates {
  private val YMD = Regex("^\\d{4}-\\d{2}-\\d{2}$")
  private val WEEKDAYS = arrayOf("일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일")

  data class Cell(val ymd: String, val day: Int, val inMonth: Boolean, val weekday: Int)

  fun isYmd(value: String?): Boolean {
    if (value == null || !YMD.matches(value)) return false
    return format(parse(value)) == value
  }

  /** 앱 정책 시간대(스냅샷 timeZone, 없으면 기기 시간대)의 오늘. */
  fun today(zoneId: String?, nowMs: Long = System.currentTimeMillis()): String {
    val zone = zone(zoneId)
    val cal = Calendar.getInstance(zone, Locale.ROOT)
    cal.timeInMillis = nowMs
    return String.format(Locale.ROOT, "%04d-%02d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))
  }

  fun zone(zoneId: String?): TimeZone {
    if (zoneId.isNullOrBlank()) return TimeZone.getDefault()
    val zone = TimeZone.getTimeZone(zoneId)
    // 모르는 id 는 GMT 로 떨어지므로 기기 시간대로 대체한다.
    return if (zone.id == "GMT" && zoneId != "GMT") TimeZone.getDefault() else zone
  }

  /** 다음 자정(해당 시간대) epoch ms. */
  fun nextMidnight(zoneId: String?, nowMs: Long = System.currentTimeMillis()): Long {
    val cal = Calendar.getInstance(zone(zoneId), Locale.ROOT)
    cal.timeInMillis = nowMs
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 5)
    cal.set(Calendar.MILLISECOND, 0)
    cal.add(Calendar.DAY_OF_MONTH, 1)
    return cal.timeInMillis
  }

  fun hm(epochMs: Long, zoneId: String?): String {
    val cal = Calendar.getInstance(zone(zoneId), Locale.ROOT)
    cal.timeInMillis = epochMs
    return String.format(Locale.ROOT, "%02d:%02d", cal.get(Calendar.HOUR_OF_DAY), cal.get(Calendar.MINUTE))
  }

  private fun utcCal(): Calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"), Locale.ROOT)

  private fun parse(ymd: String): Calendar {
    val cal = utcCal()
    cal.clear()
    cal.isLenient = true
    cal.set(ymd.substring(0, 4).toInt(), ymd.substring(5, 7).toInt() - 1, ymd.substring(8, 10).toInt())
    return cal
  }

  private fun format(cal: Calendar): String =
    String.format(Locale.ROOT, "%04d-%02d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))

  fun addDays(ymd: String, days: Int): String {
    val cal = parse(ymd)
    cal.add(Calendar.DAY_OF_MONTH, days)
    return format(cal)
  }

  fun monthStart(ymd: String): String = ymd.substring(0, 7) + "-01"

  fun shiftMonth(anchor: String, delta: Int): String {
    val cal = parse(monthStart(anchor))
    cal.add(Calendar.MONTH, delta)
    return format(cal)
  }

  fun monthEnd(anchor: String): String = addDays(shiftMonth(anchor, 1), -1)

  /** 0 = 일요일. */
  fun weekday(ymd: String): Int = parse(ymd).get(Calendar.DAY_OF_WEEK) - 1

  fun daysBetween(from: String, to: String): Int =
    ((parse(to).timeInMillis - parse(from).timeInMillis) / 86_400_000L).toInt()

  /** 일요일 시작 주 단위(앱 scheduleModel.monthGrid 와 같은 규칙). */
  fun monthGrid(anchor: String): List<List<Cell>> {
    val first = monthStart(anchor)
    val last = monthEnd(anchor)
    var day = addDays(first, -weekday(first))
    val weeks = ArrayList<List<Cell>>()
    var guard = 0
    while (day <= last && guard < 6) {
      val week = ArrayList<Cell>(7)
      for (index in 0 until 7) {
        week.add(Cell(day, day.substring(8, 10).toInt(), day.substring(0, 7) == first.substring(0, 7), index))
        day = addDays(day, 1)
      }
      weeks.add(week)
      guard += 1
    }
    return weeks
  }

  fun monthTitle(anchor: String): String = "${anchor.substring(0, 4).toInt()}년 ${anchor.substring(5, 7).toInt()}월"

  fun weekdayName(ymd: String): String = WEEKDAYS[weekday(ymd)]

  fun monthDay(ymd: String): String = "${ymd.substring(5, 7).toInt()}월 ${ymd.substring(8, 10).toInt()}일"

  fun dayTitle(ymd: String): String = "${monthDay(ymd)} ${WEEKDAYS[weekday(ymd)]}"

  /** 할 일 위젯 날짜 머리글: 오늘 · 10월 21일 / 내일 · … / 모레 · … / 그 밖 10월 24일 금요일. */
  fun todoDayLabel(selected: String, today: String): String =
    when (daysBetween(today, selected)) {
      0 -> "오늘 · ${monthDay(selected)}"
      1 -> "내일 · ${monthDay(selected)}"
      2 -> "모레 · ${monthDay(selected)}"
      else -> dayTitle(selected)
    }
}
