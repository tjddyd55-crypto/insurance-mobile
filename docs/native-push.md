# Native Push

ONE FC Native 푸시 알림 운영·개발 가이드.

## 현재 scope (v1.0.3)

**판정: A — v1.0.3 Android only**

- Android: FCM + `expo-notifications` 구현 완료 (`src/features/push/`)
- iOS: **미구현** — 모든 push 진입점이 `Platform.OS !== 'android'`에서 early return
- v1.0.3 스토어 문구·QA 범위는 Android 푸시만 포함

### iOS 포함 시 필요 작업 (별도 Phase)

| 영역 | 작업 |
|------|------|
| APNs | Apple Developer 키·프로비저닝 |
| Expo | `expo-notifications` iOS permission·token |
| Firebase | iOS 앱(`GoogleService-Info.plist`) — 사용 시 |
| 서버 | `platform: IOS` 등록·발송 경로 검증 |
| Handler | 포그라운드/백그라운드·뱃지 |
| Deep link | `pushDeepLink.ts` iOS 라우팅 QA |
| EAS | Push credentials, `eas credentials` |

## DEV / PROD Firebase 분리

- DEV: `google-services.dev.json` → `com.onefc.app.dev`
- PROD: `google-services.prod.json` (또는 prod용 파일) → `com.onefc.app`
- 파일은 **커밋하지 않음** — EAS secret / 로컬만

## 토큰·등록 API

로그인 후 (`syncPushRegistrationAfterLogin`):

1. Android 알림 권한·채널(`work` channel) 설정
2. `Notifications.getDevicePushTokenAsync()` — FCM device token
3. `POST /api/push/devices/register`

Body 필드:

- `token` — device push token
- `platform` — `ANDROID`
- `installationId` — `onefc-native-{appPackage}-{buildId|session}`
- `appPackage` — `com.onefc.app.dev` 또는 `com.onefc.app`
- `appVersion` — Expo `version`

로그아웃: `POST /api/push/devices/unregister` (installationId)

## 채널

- Android: `WORK_NOTIFICATION_CHANNEL_ID` (`notificationChannelConfig.ts`)
- Importance·이름은 업무 알림용으로 고정 — OS 설정에서 사용자가 끌 수 있음

## Deep link

푸시 payload (`pushRegistration.ts` / `pushDeepLink.ts`):

- `type`, `customerId`, `claimId`, `route`, `notificationId`
- 앱 cold start·포그라운드: `usePushNotificationListeners`

## Production QA 순서 (Android)

1. DEV 패키지 + DEV Firebase + DEV API에서 등록·수신
2. PROD 패키지 Internal track + PROD Firebase + PROD API (제한된 테스터)
3. 권한 거부·채널 off·로그아웃 unregister
4. 딥링크: 고객 상세·청구·알림함
5. **전체 사용자 rollout 전** 위 항목 PASS

## Crash / observability (참고)

푸시 실패는 서버 outbox·device row와 클라이언트 register API 응답으로 추적. 전용 crash SDK는 Phase 2에서 비교만 수행(Sentry vs Crashlytics) — 미설치.
