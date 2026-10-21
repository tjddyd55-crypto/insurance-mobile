# Android Widget Architecture

ONE FC Android 홈 화면 위젯(현재 `ONE FC 일정`, `ONE FC 할 일`)의 공통 Widget Engine 구조와 새 위젯 추가 절차.

## 흐름

```
AppWidgetProvider (얇은 provider: ScheduleWidgetProvider / TodoWidgetProvider)
        │ 시스템 콜백(onUpdate·onEnabled·onDeleted·버튼 broadcast)
        ▼
Widget Engine (native WidgetEngine.kt  ·  JS engine/widgetRefreshCoordinator.ts)
        │
        ▼
Registry (JS engine/widgetRegistry.ts  ·  native OneFcWidgetType.kt)
        │ type → adapter / renderer / refreshPolicy / deep link / cacheKey
        ▼
Adapter (JS adapters/scheduleWidgetAdapter.ts, adapters/todoWidgetAdapter.ts)
        │ 기존 앱 API·선택자 재사용
        ▼
Existing ONE FC API (fetchScheduleEvents, listTodos) — 앱 secure-store 세션 토큰은 JS 안에서만
        │
        ▼
Snapshot Cache (envelope JSON, native WidgetCacheManager: SharedPreferences "onefc_widget_engine", key widget.<type>)
        │
        ▼
Renderer (native ScheduleWidgetRenderer / TodoWidgetRenderer + WidgetCommonViews)
```

백그라운드 갱신은 단일 `OneFcWidgetRefreshWorker`(WorkManager)가 단일 headless JS entry `OneFcWidgetsRefresh`
(`{ widgetTypes, reason, force, appWidgetIds }`)를 실행한다. native 는 토큰을 읽거나 서버를 부르지 않는다.
Google API 를 위젯이 직접 부르지 않고 Google 토큰도 저장하지 않는다.

## 구성 요소

| 요소 | JS | native |
| --- | --- | --- |
| WidgetType / Registry | `engine/widgetTypes.ts`, `engine/widgetRegistry.ts` | `OneFcWidgetType.kt` |
| 공통 봉투(schemaVersion=1) | `engine/widgetEnvelope.ts` | `WidgetEnvelope.kt` (+ SchedulePayload, TodoPayload) |
| 캐시 | `widgetBridge.ts`(write/read/clearAll) | `WidgetCacheManager.kt` (종류별 키, 계정 격리, 스키마 마이그레이션, appWidgetId 인스턴스 상태) |
| 갱신 | `engine/widgetRefreshCoordinator.ts`, `useHomeWidgetSync.ts`, `widgetHeadlessTask.ts` | `WidgetScheduler.kt`, `OneFcWidgetRefreshWorker.kt`, `WidgetSystemReceiver.kt` |
| 인증 purge | `purgeWidgets(reason)` (AuthProvider 로그아웃·401·계정 변경) | `WidgetCacheManager.clearAll` → 전 종류 로그인 화면으로 다시 그림 |
| Deep link | `engine/widgetDeepLink.ts` `buildWidgetDeepLink(scheme, type, action, params)` | `WidgetDeepLink.kt` (같은 표) |
| 상태·문구 | — | `WidgetDisplayState.kt` (READY/LOADING/LOGGED_OUT/OFFLINE_STALE/AUTH_EXPIRED/ERROR), `WidgetCopy` |
| 렌더러 | — | `OneFcWidgetRenderer`, `WidgetCommonViews`, `WidgetIntents` |

### 봉투

`schemaVersion, widgetType, accountKey(u:<userId>|ga:<gaId>), gaId, userId, scheme, generatedAt, lastSuccessfulSyncAt,
timeZone, authState, syncState(ready|stale|error), errorCode(network|server|unknown), payload`.
버전이 다르거나 깨진 값은 읽을 때 지우고 다음 갱신에서 다시 만든다. 모르는 필드는 무시한다(앞으로의 확장 호환).
서버 오류 원문은 저장·표시하지 않는다.

### 갱신 사유·정책

코드 enum (`WIDGET_REFRESH_REASONS`, JS·native 공통 문자열):

| 점검 이름 | 코드 값 | 언제 |
| --- | --- | --- |
| login | `login` | 로그인 직후 |
| foreground | `appForeground` | 앱이 앞으로 나옴 |
| mutation | `appMutation` | 일정·할 일 저장/삭제 등 앱 쓰기 |
| manual | `manual` | 위젯 새로고침 버튼 |
| periodic | `periodic` | WorkManager 주기 |
| boot | `boot` | `BOOT_COMPLETED` |
| midnight | `midnight` | 자정(비정확 알람) |
| appUpdate | `appUpdate` | `MY_PACKAGE_REPLACED` |
| googleReconnect | `googleReconnect` | Google 다시 연결 |
| accountSwitch | `accountChanged` | 계정 변경. 이름은 코드에 `accountChanged` 로 고정 |

이름을 점검용 별칭으로 바꾸지 않는다. 모르는 문자열은 `periodic` 으로 떨어진다.
정책(현재 두 위젯): 주기 30분, 수동 30초 간격 제한(위젯 종류별), 앱 내 변경 시 즉시.
WorkManager unique 이름 `onefc-widget-engine-periodic` (`ExistingPeriodicWorkPolicy.KEEP`). 주기(분)는 설치된 종류의 최소값이며 15 미만으로 내려가지 않는다. 현재 일정·할 일은 둘 다 30.
1회 갱신 unique 접두사 `onefc-widget-engine-refresh-` (`ExistingWorkPolicy.KEEP`). 1분 polling·무한 서비스는 없다. 이전 이름 `onefc-home-widgets-periodic`, `onefc-home-widgets-refresh` 는 취소한다.
수동 새로고침은 `meta.lastManual.<type>` 으로 종류별 30_000ms 를 지킨다.

### 부팅·업데이트·캐시 실패

- `BOOT_COMPLETED` / `MY_PACKAGE_REPLACED`: `resetAllInstances` 후 다시 그리고, `boot` 또는 `appUpdate` 로 force 갱신, 주기 작업을 다시 등록.
- `TIMEZONE_CHANGED` / `TIME_SET`: 다시 그리기. `MIDNIGHT`: 다시 그리기 + `midnight` force 갱신.
- `meta.schema` 가 schemaVersion(1)과 다르면 SharedPreferences `onefc_widget_engine` 과 이전 저장소 `onefc_home_widgets_v1` 를 비우고 다음 갱신에서 다시 만든다.
- 봉투 JSON 이 깨졌거나 버전·종류가 다르면 그 키를 지우고 null. 화면은 로그인 필요/불러오는 중 등 `WidgetDisplayState` 로 떨어진다.

### appWidgetId 별 상태

같은 종류라도 홈 화면 인스턴스마다 따로 둔다. 키 `inst.<type>.<appWidgetId>.<field>`. 저장한 날의 오늘(`anchor`)이 지나면 기본값(오늘)으로 돌아간다. 재부팅·앱 업데이트는 인스턴스를 전부 지운다. 위젯 삭제 시 그 id 만 지운다.

| 위젯 | 필드 |
| --- | --- |
| 일정 | `month`(보던 달 1일), `selected`(선택 날짜) |
| 할 일 | `date`(선택 날짜) |

### Provider 를 하나로 합치지 않은 이유

위젯 선택 목록의 항목 하나 = manifest `<receiver>` 하나 + `appwidget-provider` 메타데이터다. 한 클래스로 두 항목을 만들 수 없으므로
종류마다 한 줄짜리 하위 클래스(`BaseOneFcWidgetProvider(type)`)를 둔다. 로직은 모두 WidgetEngine 에 있다.

## 확장성

- 데이터 없는 위젯(빠른 실행, AI 비서): Registry `dataKind: 'none'`, `adapter: null`, 주기 갱신 없음.
- 목록 위젯(알림, 상담, 청구, 고객 현황): `dataKind: 'list'`, `sensitiveDataPolicy: 'counts_only'` 기본.
- 후보 `notifications`, `consultation`, `claims`, `customerSummary`, `quickActions`, `aiAssistant` 는 `enabled: false`, `adapter: null`, `providerClass: null`. provider·피커·전용 API·추가 permission 이 없다. 위젯 목록에 나오지 않는다.

## 현재 위젯 기능

### ONE FC 일정

- 월 헤더 한 줄(`2026년 10월`)에 이전/다음 달, 새로고침, 추가. 앱 이름은 위젯 선택 목록 라벨에만 있다. 월 제목을 누르면 오늘이 있는 달로 돌아간다.
- 달력이 위젯 높이를 채운다. 칸이 크면 날짜 숫자와 제목(최대 2줄)과 `+N`. 칸이 낮으면 개수 배지만(`9+`). 배지는 `w_day_*` 아래 별도 TextView.
- 날짜 칸은 `ScheduleDayActivity`(다이얼로그 테마)로 그 날 스냅샷 목록을 연다. 항목은 상세 deep link, `+` 는 `schedule?date&create=1&src=widget`. 닫기·백은 다이얼로그를 끝내 홈으로 돌아간다. 앱 안 저장·취소·뒤로가기는 기존 `moveTaskToBack`.
- 헤더 추가도 같은 create deep link(보고 있는 달의 오늘 또는 그 달 1일).
- 수동 새로고침(30초 간격). 상태 줄(마지막 업데이트 / 새로고침 중 / 오프라인).
- 로그인 필요·세션 만료 화면은 공통 `WidgetCopy`.

### ONE FC 할 일

- 선택 날짜 목록(오늘·이전/다음 날·오늘로). 높이만큼 행, 넘치면 `+N개 더보기`.
- 행: 완료면 `✓` 와 흐린 제목, 미완료면 `○`. 탭하면 그 할 일 수정(`todos/<id>/edit?src=widget`).
- 추가 버튼 → `todos/new?dueDate&src=widget`. 제목·더보기 → 할 일 목록.
- 범위 안이고 항목이 없으면 "등록된 할 일이 없습니다". 캐시 범위 밖은 "이 날짜는 앱에서 볼 수 있어요".
- 수동 새로고침, 공통 로그인/만료/오류 화면.

### 할 일 목록과 배지

할 일 위젯 목록(`buildTodoDays`)은 앱이 `listTodos` 로 받는 ONE FC 할 일 원본을 쓴다. 예정일이 있는 미완료와 완료를 같이 보여 주고 완료는 `completed: true` 로 표시한다. 취소·예정일 없음은 빼며, 정렬은 앱과 같은 `sortTodosByRecentWrite` 다. 앱 할 일 화면의 기본 필터는 `미완료`(`bucket=open`)이고, 완료 항목은 그 화면의 `완료` 필터에서 같은 원본을 본다. 위젯은 필터 UI 가 없으므로 그 날짜의 취소되지 않은 항목(완료 포함)을 목록에 둔다.

개수 배지는 목록과 다른 집합이다. SSOT 는 `countItemsByDay` + `dayCountLabel` (`src/features/schedule/scheduleModel.ts`). 일정 화면과 `scheduleWidgetAdapter` 가 같은 함수를 쓴다.

- 일정 이벤트: KST 로 걸친 날마다 1. Google 일정 포함. 끝이 자정이면 그 날은 빼며, 하루 범위 가드는 400.
- 할 일: `dueDate` 가 있고 `status !== 'completed'` 인 것만. 완료·예정일 없음·취소는 배지에 넣지 않는다. 같은 항목을 이벤트와 할 일로 두 번 세지 않는다(이벤트 루프와 할 일 루프가 분리).
- 라벨: 0 은 빈 문자열(숨김), 1–9 는 숫자, 10 이상은 `9+`.
- 웹과 같은 케이스: `src/features/schedule/__fixtures__/scheduleDayCountCases.json`, 테스트 `scheduleDayCount.test.ts`.

## 새 위젯 추가 절차

1. **WidgetType**: `engine/widgetTypes.ts` 의 `WIDGET_TYPES` 와 `OneFcWidgetType.kt` 에 같은 id.
2. **Registry**: `WIDGET_REGISTRY` 항목. 켤 때만 `enabled: true`. refreshPolicy, sensitiveDataPolicy, watchesQueryKeys.
3. **Payload DTO**: JS payload 타입과 native `<Name>Payload.parse(envelope)`. 공통 봉투 필드는 그대로 두고 payload 만 추가한다.
4. **Adapter**: `adapters/<name>WidgetAdapter.ts`. 기존 앱 API·선택자만 사용. 연락처·주민번호·상담/청구 본문·토큰 금지.
5. **Renderer**: `OneFcWidgetRenderer` 구현. 공통 상태 화면은 `WidgetCommonViews`. `WidgetEngine.renderers` 에 등록.
6. **Deep Link**: JS `ROUTES` 와 native `WidgetDeepLink` 에 같은 경로. `src=widget&wt=<type>` 는 빌더가 붙인다. scheme 은 `getEnvironmentConfig().scheme` (dev `onefc-dev`, prod `onefc`).
7. **Provider 필요 여부**: 홈 화면 위젯 목록에 새 항목이 필요하면 `class XWidgetProvider : BaseOneFcWidgetProvider(OneFcWidgetType.X)` 와 `providerClass`. 기존 provider 의 데이터만 바꾸면 새 provider 는 만들지 않는다.
8. **Manifest metadata**: 새 provider 일 때만 `<receiver>` + `res/xml/onefc_widget_<name>_info.xml` + 레이아웃·문자열. `enabled=false` 후보는 receiver 를 넣지 않는다.
9. **Tests**: Registry enabled 여부, payload 파싱, deep link(dev/prod scheme), adapter 최소 필드, native 상태/렌더러.
10. **Binary build 필요 여부**: 아래 조건을 따른다.

## 바이너리 빌드가 필요한 조건

현재 ONE FC 일정·ONE FC 할 일 위젯은 provider, manifest, 레이아웃, native Widget Engine 이 들어 있다. 이 두 위젯을 기기에 넣으려면 **새 binary(스토어 또는 내부 APK 빌드)가 필요하다**. 지금 스토어에 있는 바이너리만으로는 홈 화면 목록에 나오지 않는다.

새 provider(새 위젯 목록 항목, manifest receiver, 레이아웃, native 렌더러)를 추가할 때도 **새 binary가 필요하다**. Registry 만 `enabled: true` 로 바꿔도 provider 가 없는 바이너리의 위젯 목록에는 나타나지 않는다.

이미 그 provider 가 들어 있는 binary 위에서는 JS/data 만 바뀌는 변경(adapter 가 채우는 필드, deep link 대상 화면, 서버에서 오는 일정·할 일 데이터)이 **OTA 로 반영될 수 있다**. OTA 는 그 binary 가 이미 있을 때의 데이터 경로이지, 현재 위젯을 처음 배포하는 방법이 아니다.

## SharedPreferences (`onefc_widget_engine`, MODE_PRIVATE)

토큰, refresh token, ONE FC bearer, Google access token, 연락처, 상담 본문은 키로도 값으로도 저장하지 않는다. native 는 HTTP/Google API 를 호출하지 않는다. 세션 토큰은 JS secure-store 에만 있고 위젯 저장소로 복사하지 않는다.

| 키 | 값 |
| --- | --- |
| `meta.schema` | 엔진 schemaVersion (1) |
| `meta.scheme` | 앱 scheme (`onefc` 또는 `onefc-dev`) |
| `meta.clearReason` | `logged_out` / `session_expired` / `account_changed` / `schema_reset` |
| `meta.refreshing.<type>` | 새로고침 시작 시각(ms) |
| `meta.lastManual.<type>` | 마지막 수동 새로고침 시각(ms) |
| `widget.<type>` | 봉투 JSON 한 덩어리 |
| `inst.<type>.<appWidgetId>.anchor` | 그 상태를 저장한 날(YYYY-MM-DD) |
| `inst.<type>.<appWidgetId>.month` / `.selected` / `.date` | 위 인스턴스 상태 |

봉투 JSON 필드: `schemaVersion, widgetType, accountKey(u:<userId>|ga:<gaId>), gaId, userId, scheme, generatedAt, lastSuccessfulSyncAt, timeZone, authState, syncState, errorCode, payload`.
일정 payload: `visibleRange, selectedDate, calendarDays, calendarCounts, events[{date, items[{id, title, time, kind, done, link}]}], googleNotice`(짧은 안내 문구만).
할 일 payload: `visibleRange, selectedDate, todos[{date, items[{id, title, completed, link}]}]`.
`userId`/`gaId` 는 계정 격리용이고 인증 비밀이 아니다. `link` 는 앱 scheme deep link 이며 토큰 쿼리를 넣지 않는다.

## 로그아웃·계정 전환

`AuthProvider` 로그아웃·401 은 `purgeWidgets('logged_out' | 'session_expired')`. 계정 키가 바뀌면 `accountChanged` 전에 `purgeWidgets('account_changed')`. native `clearAll` 은 Registry 의 `widget.*`, `inst.*`, `meta.refreshing.*` 를 지우고 `LOGGED_OUT` 또는 `AUTH_EXPIRED` 로 즉시 다시 그린다. 문구는 "로그인이 필요합니다" / "ONE FC에 로그인해 주세요".
