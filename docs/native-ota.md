# ONE FC Native — OTA (EAS Update)

Production/Development OTA 운영 SSOT. Store identity·runtime·channel은 서로 격리됩니다.

## 환경 매트릭스

| 환경 | App ID | version (runtime) | EAS channel | OTA publish |
|------|--------|-------------------|-------------|-------------|
| Development Client | `com.onefc.app.dev` | `1.0.0` | `native-development` | DEV only |
| Preview (internal APK) | `com.onefc.app.dev` | `1.0.0` | `native-preview` | E2E 테스트 |
| Production staging | `com.onefc.app` | `1.0.3` | `native-production-staging` | staging 검증 |
| Production | `com.onefc.app` | `1.0.3` | `native-production` | **승인 후만** |
| Production APK (internal QA) | `com.onefc.app` | `1.0.3` | `native-qa` | QA 전용. `native-production` publish 금지 |

`production-apk`는 production과 같은 `APP_VARIANT` / `EXPO_PUBLIC_APP_ENV` / EAS `environment: production`(API URL 포함)을 쓰고, Android만 `apk`로 만든다. `distribution: internal`은 환경 변수를 자동으로 `preview`에 붙이므로, 이 프로필만 `environment`를 `production`으로 고정한다. 채널은 `native-qa`라서 production OTA가 이 바이너리에 닿지 않는다.

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

## 앱 동작 (업데이트 UX)

구현: [`src/features/app-update`](../src/features/app-update), OTA 어댑터: [`src/services/appUpdates.ts`](../src/services/appUpdates.ts), 부트스트랩: [`app/_layout.tsx`](../app/_layout.tsx)의 `AppUpdateHost`

코디네이터는 한 번에 프롬프트 하나만 띄운다. 순서는 **OTA 확인·받기 → 적용 확인 → 그 다음 Android Play 인앱 업데이트**다. OTA `reloadAsync()`는 JS를 다시 시작하므로 Play 다운로드보다 먼저 끝낸다.

### EAS OTA

1. 콜드 스타트와 포그라운드 복귀(15분 스로틀, `setInterval` 폴링 없음)에 `checkForUpdateAsync` → 있으면 `fetchUpdateAsync`
2. `native-production`에서 새 번들이 준비되면 `새 업데이트가 준비되었습니다. 최신 버전을 적용합니다.` / **[지금 적용]** → `reloadAsync()`
3. 콜드 스타트 자동 reload는 하지 않는다. 스플래시·인증 이동과 겹치면 검은 화면이 날 수 있고, 포그라운드 자동 재시작은 작업 중 화면을 버린다
4. 적용하지 않으면 받은 번들은 다음 콜드 스타트에 적용된다. 다른 채널은 기존처럼 받아 두기만 하고 프롬프트·reload 하지 않는다
5. `__DEV__` / dev client(`storeClient` 또는 channel `native-development`) / `Updates.isEnabled === false` → OTA skip
6. 네트워크·EAS 오류·15초 타임아웃은 로그만 남기고 앱 진입을 막지 않는다. 검사는 첫 렌더를 기다리지 않는다

### Google Play 인앱 업데이트 (Android)

- 모듈: `modules/onefc-play-app-update` (`com.google.android.play:app-update:2.1.0`)
- 대상: Play(`com.android.vending`)가 설치한 Android 프로덕션 앱. iOS는 no-op
- 기본 **FLEXIBLE**. 문구 확인 후 Play 시트를 띄우고, 받는 동안 앱은 그대로 쓴다. `DOWNLOADED`면 `업데이트가 준비되었습니다.` / **[지금 설치]** → `completeUpdate`
- **IMMEDIATE** 경로는 `resolvePlayUpdateFlow()`에만 연결되어 있다. 서버 강제 업데이트는 없다
- preview APK, `production-apk`, 사이드로드, 개발 빌드는 Play API를 호출하지 않거나 `not_from_play`로 건너뛴다. 인앱 업데이트는 Play 트랙으로 설치한 빌드에서만 동작한다

`app.config.ts`:

- `checkAutomatically: 'NEVER'` — 코디네이터가 직접 check
- `fallbackToCacheTimeout: 0` — 즉시 cached/embedded 실행
- `runtimeVersion` 정책 `appVersion`, channel `native-production`은 변경하지 않는다

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

### 5. PC 없이 수동 발행 (GitHub Actions)

워크플로: [`.github/workflows/ota.yml`](../.github/workflows/ota.yml) (`Manual OTA`)

`workflow_dispatch`만 있다. push·pull request로는 실행되지 않는다. 실행 브랜치의 워크플로 파일을 쓰므로, 이 문서가 들어 있는 커밋이 있는 브랜치(보통 `release/native-v1.0.3`)를 고른다.

1. GitHub → Actions → **Manual OTA** → **Run workflow**
2. 브랜치: 발행할 커밋이 있는 브랜치
3. `platform`: `android` | `ios` | `all` (기본 `all`)
4. `message`: EAS에 남길 설명
5. Repository secret `EXPO_TOKEN`이 있어야 한다

실행 순서:

1. `npm ci`
2. `npm run typecheck`와 `npm test -- --runInBand`가 통과해야 다음으로 간다. 이 릴리스 브랜치의 `npm run check`는 기존 eslint 오류로 이미 실패하므로, 워크플로는 그 대안으로 typecheck와 Jest를 게이트로 쓴다.
3. `APP_VARIANT=production`, `EXPO_PUBLIC_APP_ENV=production`으로 읽은 runtime이 `1.0.3`이 아니면 **발행하지 않고 실패**한다. 값은 로그에 출력한다.
4. 아래와 같이 production channel에 발행한다.

```bash
eas update \
  --channel native-production \
  --environment production \
  --platform <android|ios|all> \
  --message "<입력>" \
  --non-interactive
```

5. 로그의 update group ID를 job summary에 남긴다. ID를 읽지 못하면 job은 실패한다.

이 워크플로는 `native-production`에 바로 발행한다. 승인 없이 실행하지 않는다.

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

- [ ] `native-production` 바이너리 cold start → OTA가 있으면 적용 문구 → [지금 적용] → reload. 적용 전에는 작업이 유지된다
- [ ] 오프라인·EAS 오류 → 프롬프트 없이 앱 진입, crash 없음
- [ ] runtime 불일치 update → 기존 번들 유지
- [ ] DEV Metro (`start:device` 8084) → OTA skip, Dev Client 정상
- [ ] preview / `production-apk` / 사이드로드 → Play 인앱 업데이트 skip, crash 없음
- [ ] Play internal testing으로 설치한 빌드 + 더 높은 versionCode → FLEXIBLE 문구 → 받는 동안 앱 사용 → [지금 설치]
- [ ] OTA 프롬프트와 Play 프롬프트가 동시에 보이지 않음
- [ ] `eas update:rollback` 후 embedded/이전 번들 복귀

## 관련 문서

- [eas-ota-isolation.md](./eas-ota-isolation.md)
- [native-release.md](./native-release.md)
