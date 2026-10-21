package expo.modules.onefchomewidgets

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetSnapshotTest {
  private fun json(version: Int = 1, scheme: String = "onefc", link: String = "onefc://todos/7/edit?src=widget") = """
    {"version":$version,"accountKey":"u:1|ga:2","scheme":"$scheme","timeZone":"Asia/Seoul","lastUpdatedAt":"2026-10-21T03:15:00.000Z",
     "schedule":{"from":"2026-09-01","to":"2026-12-31","googleNotice":null,"ok":true,
       "days":[{"date":"2026-10-21","items":[{"id":"e1","title":"김철수 상담","time":"09:30","kind":"event","done":false,"link":"onefc://schedule?date=2026-10-21&src=widget&event=e1"}]},
               {"date":"bad","items":[{"id":"x"}]}]},
     "todos":{"from":"2026-09-01","to":"2026-12-31","ok":true,
       "days":[{"date":"2026-10-21","items":[{"id":"7","title":"서류 확인","completed":true,"link":"$link"}]}]}}
  """.trimIndent()

  @Test fun parsesContract() {
    val snapshot = WidgetSnapshot.parse(json())!!
    assertEquals("u:1|ga:2", snapshot.accountKey)
    assertEquals(1, snapshot.scheduleDays["2026-10-21"]!!.size)
    assertEquals("09:30", snapshot.scheduleDays["2026-10-21"]!![0].time)
    assertTrue(snapshot.todoDays["2026-10-21"]!![0].completed)
    assertNull(snapshot.googleNotice)
    assertEquals(1, snapshot.scheduleDays.size)
    assertTrue(snapshot.lastUpdatedAtMs > 0)
    assertEquals("12:15", WidgetDates.hm(snapshot.lastUpdatedAtMs, snapshot.timeZone))
  }

  @Test fun rejectsUnknownVersionAndBadScheme() {
    assertNull(WidgetSnapshot.parse(json(version = 2)))
    assertNull(WidgetSnapshot.parse(json(scheme = "Bad Scheme")))
    assertNull(WidgetSnapshot.parse("{not json"))
    assertNull(WidgetSnapshot.parse(null))
  }

  @Test fun dropsForeignLinks() {
    val snapshot = WidgetSnapshot.parse(json(link = "https://evil.example/x"))!!
    assertEquals("", snapshot.todoDays["2026-10-21"]!![0].link)
  }
}
