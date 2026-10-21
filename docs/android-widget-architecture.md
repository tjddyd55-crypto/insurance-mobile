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

사유: `login, appForeground, appMutation, manual, periodic, boot, midnight, appUpdate, googleReconnect, accountChanged`.
정책(현재 두 위젯): 주기 30분, 수동 30초 간격 제한(위젯 종류별), 앱 내 변경 시 즉시.

### Provider 를 하나로 합치지 않은 이유

위젯 선택 목록의 항목 하나 = manifest `<receiver>` 하나 + `appwidget-provider` 메타데이터다. 한 클래스로 두 항목을 만들 수 없으므로
종류마다 한 줄짜리 하위 클래스(`BaseOneFcWidgetProvider(type)`)를 둔다. 로직은 모두 WidgetEngine 에 있다.

## 확장성

- 데이터 없는 위젯(빠른 실행, AI 비서): Registry `dataKind: 'none'`, `adapter: null`, 주기 갱신 없음.
- 목록 위젯(알림, 상담, 청구, 고객 현황): `dataKind: 'list'`, `sensitiveDataPolicy: 'counts_only'` 기본.
- 현재 둘 다 구현하지 않았다(enabled=false, provider·manifest 없음, 위젯 목록에 나오지 않음).

## 새 위젯 추가 절차

1. **WidgetType**: `engine/widgetTypes.ts` 와 `OneFcWidgetType.kt` 에 같은 id(이미 있으면 생략).
2. **Registry**: `WIDGET_REGISTRY` 항목을 채우고 `enabled: true`, refreshPolicy, sensitiveDataPolicy, watchesQueryKeys 지정.
3. **Adapter**: `adapters/<name>WidgetAdapter.ts` — 기존 API·선택자만 사용, 최소 필드(연락처·주민번호·상담/청구 상세 금지).
4. **Payload DTO**: JS 타입 + native `<Name>Payload.parse(envelope)`.
5. **Renderer**: `OneFcWidgetRenderer` 구현, 공통 상태 화면은 `WidgetCommonViews` 사용. `WidgetEngine.renderers` 에 등록.
6. **Deep link**: JS `ROUTES` 와 native `WidgetDeepLink` 표에 같은 경로(`src=widget&wt=<type>` 자동).
7. **Provider(필요 시)**: `class XWidgetProvider : BaseOneFcWidgetProvider(OneFcWidgetType.X)` 와 `OneFcWidgetType.providerClass`.
8. **Manifest metadata**: `<receiver>` + `res/xml/onefc_widget_<name>_info.xml` + 레이아웃·문자열.
9. **Tests**: Registry, payload 파싱, deep link, adapter 최소 필드, native 상태/렌더러 단위 테스트.
10. **Binary check**: 아래 참고.

## 바이너리(OTA 불가) 규칙

새 `AppWidgetProvider` 종류(위젯 목록 항목), manifest·레이아웃·native 코드 변경은 **새 바이너리(스토어/APK 빌드)가 필요하다**.
OTA 로는 기존 위젯의 JS 측(Adapter 데이터, deep link 대상 화면)만 바꿀 수 있다. Registry 에서 `enabled: true` 로 바꿔도
native provider 가 없는 바이너리에서는 위젯 목록에 나타나지 않는다.
