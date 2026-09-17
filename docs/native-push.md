# Native Push

ONE FC Native 푸시 알림 운영·개발 가이드.

## Delivery 정책 (최종)

Push와 Kakao 알림톡은 **독립 채널**이다. Push token 유무·Push 성공/실패는 Kakao 발송 조건에 **사용하지 않는다**.

| 이벤트 | Production Kakao | Production Push |
|--------|------------------|---------------|
| 링크 고객등록 완료 | ON (기존 유지) | ON |
| 고객 청구 신청 | ON (기존 유지) | ON |
| 소식지 게시 | OFF | ON |

Development:

- Kakao 운영 실발송: OFF (고객등록·청구)
- Push 테스트: ON
- 소식지: Push only (Kakao 없음)

금지 정책 (구현하지 않음):

- Push device 있으면 Kakao 미발송
- Push 실패 시 Kakao fallback
- Push token 없을 때만 Kakao 발송

## 현재 scope

- **Android**: FCM + `expo-notifications` 구현 완료
- **iOS**: 클라이언트 코드 구현 완료 — APNs/Firebase 인프라 설정 후 실기기 QA
- v1.0.3 스토어 빌드는 별도 승인 후 수행

## 공통 흐름

```
업무 이벤트
  → notifications (in-app SSOT)
  → notification_push_outbox
  → FCM/APNs
  → Native 알림함
  → Deep Link Target (pushDeepLink.ts)
```

## DEV / PROD Firebase 분리

- DEV: `google-services.dev.json` → `com.onefc.app.dev`
- PROD: `google-services.prod.json` → `com.onefc.app`
- 파일은 커밋하지 않음 — EAS secret / 로컬만

## 토큰·등록 API

로그인 후 (`syncPushRegistrationAfterLogin`):

1. 알림 권한·채널(Android `claim_notifications`) 설정
2. `Notifications.getDevicePushTokenAsync()`
3. `POST /api/push/devices/register`

Body: `token`, `platform` (`ANDROID`|`IOS`), `installationId`, `appPackage`, `appVersion`

로그아웃: `POST /api/push/devices/unregister`

## Deep link

Push payload (`pushDeepLink.ts`):

| type | 화면 |
|------|------|
| `CUSTOMER_CREATED` | `/customers/[customerId]` |
| `CUSTOMER_CLAIM_SUBMITTED` 등 | `/customers/[customerId]/claim-requests` |
| `NEWSLETTER_PUBLISHED` | `/portal/newsletters?newsletterId=...` |

Kakao `고객등록 확인`: `/staff-app/open` → `onefc://customers/{id}` (Web fallback 있음)

## Production QA 순서 (Android)

1. DEV 패키지 + DEV API에서 등록·수신
2. PROD Internal track + PROD API (제한 테스터)
3. 고객등록·청구·소식지 Push tap route
4. Kakao 고객등록/청구 **기존 수신 유지** + `고객등록 확인` Native route
5. 소식지 Kakao **미발송** 확인

## iOS 인프라 (사용자 액션)

- Firebase iOS app: `com.onefc.app`
- `GoogleService-Info.plist` (production)
- EAS APNs key / Push credentials
