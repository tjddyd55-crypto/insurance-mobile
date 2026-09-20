# ONE FC Native — OTA (EAS Update)

Production/Development OTA 운영 SSOT. Store identity·runtime·channel은 서로 격리됩니다.

## 환경 매트릭스

| 환경 | App ID | version (runtime) | EAS channel | OTA publish |
|------|--------|-------------------|-------------|-------------|
| Development Client | `com.onefc.app.dev` | `1.0.0` | `native-development` | DEV only |
| Preview (internal APK) | `com.onefc.app.dev` | `1.0.0` | `native-preview` | E2E 테스트 |
| Production staging | `com.onefc.app` | `1.0.3` | `native-production-staging` | staging 검증 |
| Production | `com.onefc.app` | `1.0.3` | `native-production` | **승인 후만** |

- EAS projectId: `5e46e0bc-2885-4455-88ce-9ca1623df305` (Legacy WebView `46c22c3a-...`와 분리)
- `runtimeVersion` 정책: `appVersion` (`app.config.ts`)
- Legacy WebView channel `main` / runtime `"production"`에는 **절대 publish 금지**

## OTA 가능 vs Store Build 필요

### OTA 가능 (JS 번들만 변경)

- React/TS UI·화면·로직
- 번들 내 assets (이미지, 폰트 등)
- API endpoint를 코드 상수로 변경 (환경별 `EXPO_PUBLIC_*` 변경은 빌드 시점 고정)
- 텍스트·copy·validation·presentation layer

### Store Build 필요 (네이티브 바이너리 변경)

- `expo-updates` 최초 도입·네이티브 모듈 추가/업그레이드
- `app.config.ts` plugin·permissions·intent filters 변경
- `version` / `versionCode` / `buildNumber` bump
- `runtimeVersion` 호환성이 깨지는 변경
- iOS Push/APNs·Firebase native 설정 변경

**규칙**: DEV `version`을 Production `1.0.3`과 같게 만들지 않는다. runtime이 겹치면 channel 격리만으로는 부족할 수 있다.

## 앱 동작 (자동 업데이트 UX)

구현: [`src/services/appUpdates.ts`](../src/services/appUpdates.ts), 부트스트랩: [`app/_layout.tsx`](../app/_layout.tsx)

1. Release 빌드 cold start 시 백그라운드로 1회 `checkForUpdateAsync` → `fetchUpdateAsync`
2. **`reloadAsync()` 호출 없음** — 사용자 작업 중 강제 재시작 방지
3. 다운로드된 번들은 **다음 cold start**에 자동 적용
4. `__DEV__` / Dev Client development mode / `Updates.isEnabled === false` → skip
5. 실패 시 로그만, crash·blocking UI 없음
6. 세션당 1회 check (`hasCheckedThisSession`)

`app.config.ts`:

- `checkAutomatically: 'NEVER'` — 서비스에서 수동 1회 check
- `fallbackToCacheTimeout: 0` — 즉시 cached/embedded 실행

## 배포 절차

### 1. 최초 OTA 활성화 (1회)

`expo-updates` 포함 **새 Store Build**가 선행되어야 한다. 기존 스토어 바이너리(OTA 미포함)에는 OTA가 동작하지 않는다.

```bash
eas build --profile production --platform android
# iOS는 plist/APNs 준비 후
eas build --profile production --platform ios
```

### 2. Staging 검증 (권장)

```bash
eas update \
  --channel native-production-staging \
  --environment production \
  --message "1.0.3 hotfix candidate"
```

`production-staging` 프로필 빌드(Play Internal / TestFlight)에서 검증 후 production으로 승격.

### 3. Production publish (승인 후)

```bash
# 검증된 동일 번들 승격
eas update:republish --destination-channel native-production

# 또는 직접 publish (초기 rollout 권장)
eas update \
  --channel native-production \
  --environment production \
  --rollout-percentage 10 \
  --message "1.0.3 hotfix"
```

### 4. DEV / Preview 테스트

```bash
eas update --channel native-preview --environment development --message "OTA E2E test"
```

Production channel에는 테스트 publish **금지**.

## Rollback

```bash
eas update:rollback
```

대화형 절차에서 선택:

- 이전 정상 update 재게시
- embedded update 복귀

주의:

- 로컬 저장소 스키마를 비호환 방식으로 변경했다면 rollback보다 fix-forward가 안전할 수 있다.
- Error recovery는 최후 방어선이며 배포 전 검증을 대체하지 않는다.

## Production OTA publish 금지 조건

다음이 해결·승인되기 전 **native-production publish 금지**:

- staging channel 실기기 검증 미완료
- `npm run release:preflight:full` FAIL
- 네이티브 의존성/plugin 변경이 OTA로 배포된 경우 (Store Build 필요)
- Product/Design OTA 정책 미승인
- runtime 불일치 update (예: `1.0.3` 바이너리에 `1.0.0` 번들)

## 검증 체크리스트

- [ ] Release APK/AAB 설치 → 첫 실행 (embedded) → 완전 종료 → 두 번째 실행 update 적용
- [ ] 오프라인 첫 실행 → 앱 정상, crash 없음
- [ ] runtime 불일치 update → 기존 번들 유지
- [ ] DEV Metro (`start:device` 8084) → OTA skip, Dev Client 정상
- [ ] `eas update:rollback` 후 embedded/이전 번들 복귀

## 관련 문서

- [eas-ota-isolation.md](./eas-ota-isolation.md)
- [native-release.md](./native-release.md)
