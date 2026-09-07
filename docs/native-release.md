# Native Release

ONE FC Native v1.0.3 릴리스 운영 가이드. **Production rollout은 별도 승인 후에만 진행합니다.**

## 버전·패키지 (현재 정책)

| 항목 | DEV | PROD (스토어) |
|------|-----|----------------|
| `version` | 1.0.0 | 1.0.3 |
| Android `versionCode` | 1 | 5 |
| iOS `buildNumber` | 1 | 5 |
| Branch | `release/native-v1.0.3` | 동일 (스토어 제출 시) |

정의: `app.config.ts` — PROD는 Play 기존 1.0.2 (versionCode 4) 다음 시퀀스를 따릅니다.

## EAS

- Slug: `one-fc-native`
- **Legacy WebView EAS projectId는 M1에서 재사용하지 않음** (OTA 충돌 방지). 신규 프로젝트 ID는 EAS 대시보드에서 발급 후 `eas.json` / `app.config.ts`에 반영.
- 프로필 예: `device`, `development`, `preview`, `production` (`eas.json`)
- DEV 채널: `native-development` — PROD 채널: `native-production`

## Android 서명

- Upload key / keystore: EAS Credentials 또는 팀 secret manager에만 보관
- 로컬 `credentials.json`·keystore 파일 **커밋 금지**

## 빌드 (예시)

```bash
# DEV 실기기 APK (internal)
eas build --profile device --platform android

# PROD AAB — 스토어 제출 승인 후만
eas build --profile production --platform android
```

## Internal Testing

1. `com.onefc.app` PROD 패키지로 Internal track 업로드
2. 테스터 그룹에만 배포
3. DEV(`com.onefc.app.dev`)와 PROD 동시 설치로 회귀 확인

## Production rollout 금지 조건 (현재)

다음이 해결·승인되기 전에는 **Production 트랙 / 전체 rollout 금지**:

- Native 실기기 QA 전 화면 PASS (Phase 2 Android QA)
- 결제·SMS·알림 등 운영 변경과 무관한 안정화 마커 완료
- Product/Design 스토어·개인정보·OTA 정책 서명
- iOS Push scope 결정 (현재 v1.0.3는 **Android Push only** — [native-push.md](./native-push.md))

## main merge

- Native 안정화 작업은 `release/native-v1.0.3`에서 진행
- **main 직접 merge 금지** (팀 정책)

## OTA

- `runtimeVersion`·channel이 WebView 레거시와 격리되어야 함 (`docs/eas-ota-isolation.md`)
- PROD OTA는 스토어 빌드와 runtime 정책 검토 후에만
