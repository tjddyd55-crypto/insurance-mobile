package expo.modules.onefchomewidgets

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WidgetQuickEntryLinkTest {
  @Test fun loginLinkKeepsModeAndDate() {
    assertEquals("onefc://schedule?date=2026-10-27&quick=createEvent&src=widget&wt=schedule", WidgetDeepLink.quickEntry("onefc", "createEvent", "2026-10-27"))
    assertEquals("onefc://todos?date=2026-10-27&quick=createTodo&src=widget&wt=todo", WidgetDeepLink.quickEntry("onefc", "createTodo", "2026-10-27"))
    assertEquals("onefc://schedule?date=2026-10-27&quick=day&src=widget&wt=schedule", WidgetDeepLink.quickEntry("onefc", "day", "2026-10-27"))
    assertEquals("onefc://schedule?date=2026-10-27&quick=day&src=widget&wt=schedule", WidgetDeepLink.quickEntry("onefc", "weird", "2026-10-27"))
  }

  @Test fun invalidInputFallsBack() {
    assertNull(WidgetDeepLink.quickEntry("", "day", "2026-10-27"))
    assertNull(WidgetDeepLink.quickEntry("onefc", "day", "bad"))
  }
}
