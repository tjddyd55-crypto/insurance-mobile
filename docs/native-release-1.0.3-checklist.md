# ONE FC Native 1.0.3 Release Checklist

Last updated: 2026-09-18  
Branch: `release/native-v1.0.3`

## Pre-release gates

- [x] Code QA complete (`ONEFC_REMAINING_CODE_QA_COMPLETE`)
- [ ] Device QA complete (`DEVICE_QA_PENDING`)
- [ ] Production backend merged/deployed with comments API + schema
- [ ] Production DB init (`customer_news_comments`) verified on deploy
- [ ] Android/iOS push config verified on real devices
- [ ] `npm run release:preflight:release` PASS after version bump to 6

## Version (release step only)

| Platform | Current config | Release target |
|----------|----------------|----------------|
| versionName | 1.0.3 | 1.0.3 |
| Android versionCode | 5 | **6** |
| iOS buildNumber | 5 | **6** |

Do **not** bump to 6 until device QA is complete.

## Deploy order

1. Merge `develop` → production backend branch and deploy backend
2. Confirm server startup runs `initDb()` (creates `customer_news_comments` if missing)
3. Smoke test backend APIs used by Native 1.0.3
4. Bump Native `versionCode` / `buildNumber` to 6
5. Run `npm run release:preflight:release`
6. Build Android AAB (production profile)
7. Build iOS IPA (after Firebase plist + APNs ready)
8. Internal verification (Play internal / TestFlight)
9. Store rollout

Native must not ship comments UI before backend comments routes are live in Production.

## Production migration checklist

| Schema / capability | DEV | Production required | Risk | Order | Rollback |
|---------------------|-----|---------------------|------|-------|----------|
| `customer_news_comments` | Yes | **Yes** | Low (additive) | Before/with backend deploy | Drop table only if API rolled back |
| `customer_special_dates` | Yes | Yes | Low | Already on main | N/A |
| `user_push_devices` | Yes | Yes | Low | Existing | N/A |
| Storage/files schema | Yes | Yes | Low | Existing | N/A |
| `todos` | Yes | Yes | Low | Existing | N/A |

Backend uses `server/initDb.js` idempotent DDL (no separate migration files).

## Build commands (release phase only)

```bash
# Audit mode (current — expects code 5, flags iOS plist missing)
npm run release:preflight

# Store release mode (after bump to 6)
npm run release:preflight:release

# With typecheck + tests
npm run release:preflight:full
```

## Store release notes (draft)

- 고객 앱 소식지 작성·미리보기·이미지 표시가 개선되었습니다.
- 고객지도에서 동일 위치 고객을 더 쉽게 확인할 수 있습니다.
- 고객 알림일과 할 일 관리가 안정화되었습니다.
- 고객 파일 보기·공유 동작이 개선되었습니다.
- 보험사 연락처와 업무 알림 사용성이 개선되었습니다.
- 기타 오류 수정 및 성능 개선

## Internal QA notes

### Device QA pending

- Map: grouped marker, 2-step tap, search/favorites, my location
- Customer files: image/PDF preview, open-token, Korean filenames
- Insurer contacts: `tel:` intent
- Push: foreground/background/killed, customer/claim/newsletter deep links
- Customer news: text/image/carousel/edit preview/comments
- Alert dates: create + detail CRUD
- Todos: CRUD, due date, no deadline suggestion UI

### Code-verified

- Customer news title removed; carousel SSOT
- Todo deadline suggestion UI removed from Native form
- Push registration payload mapping (ANDROID/IOS, appPackage)
- DEV/PROD identity separation tests

## iOS remaining user actions

1. Create Firebase iOS app `com.onefc.app`
2. Download `GoogleService-Info.plist` (do not commit)
3. Register APNs key in Firebase
4. Configure Apple APNs `.p8`, Key ID, Team ID `HVK2UWPBY9`
5. Verify EAS iOS credentials (do not delete existing distribution assets)
6. Set `GOOGLE_SERVICES_INFO_PLIST` or place plist locally for EAS build

## Android Production Firebase

- Package: `com.onefc.app`
- Provide `GOOGLE_SERVICES_JSON` via EAS secret for production builds
- Verify `PUSH_APP_PACKAGE=com.onefc.app` on Production backend
