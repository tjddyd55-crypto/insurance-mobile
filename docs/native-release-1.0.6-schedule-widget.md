# ONE FC 1.0.6 — schedule display and Android calendar widget

Base: main `67eaf7e429939fa310ece5404204638060cc84cd` (PR #56).

## Scope

- Move display controls from ScheduleScreen to NotificationSettingsScreen, using the existing schedule-view-prefs GET/PATCH endpoints and query keys.
- Save only changed settings. Keep successful saves when a later endpoint fails; refresh schedule queries and the existing widget coordinator after display saves.
- Preserve ScheduleMonthCalendar from main, including natural title wrapping, sizing and previous/today/next navigation.
- Android schedule widget: 520dp preferred height, 360dp minimum resize height, six launcher rows, existing schedule palette, two title lines without ellipsis, completion opacity/strike-through and highlighted today number.
- Small widgets and large fonts reduce preview cards to avoid overlaps; remaining entries use +N or count badges.
- Retain day details, swipe, quick add, deep links, month navigation and refresh.
- PR #55 was used only as a source for selected files/hunks. No merge/cherry-pick of #55, #50 or #39. No contacts, weekly planner, Todo completion or unrelated CRM changes.

## Binary contract

| Item | Value |
| --- | --- |
| EAS profile | production |
| Android package | com.onefc.app |
| Version / versionCode | 1.0.6 / 16 |
| Runtime | 1.0.6 (appVersion policy) |
| Update channel | native-production |
| API | Existing EAS production EXPO_PUBLIC_API_BASE_URL_PROD |
| Output | AAB; no automatic Play submission |
| Signing | Existing EAS-managed production upload key; verify build details before submission |

Native Kotlin/XML/drawable/provider changes require installation of a new binary. An OTA for the old 1.0.5 runtime does not deliver these changes. No OTA is part of this change.

## Verification before merging and submitting

- Typecheck and full Jest suite.
- `android/gradlew :onefc-home-widgets:testDebugUnitTest`, including RemoteViews inflation at SDK 28 and 34, six-week sizing, colors, completed filtering and today/selection overlap.
- Review changed files against main; ScheduleMonthCalendar and existing day detail/quick entry implementations must have no diff.
- Device: calendar opens directly without display controls; previous/today/next; title wrapping; event details.
- Device: all seven display controls load in notification settings; explicit Save updates calendar and widget.
- Same account Web/PC: changes propagate in both directions without overwriting unsaved edits; API outage keeps other notification controls usable.
- Launcher: resize, four/five/six-week months, large fonts, long titles, card colors, completed visibility, date click, swipe, today, quick add, deep link and refresh.

Automated test results and build IDs are recorded in the PR. Real account/launcher checks must be reported separately from unit-test coverage. Keep the PR unmerged and do not submit to Play while required checks remain unresolved.
