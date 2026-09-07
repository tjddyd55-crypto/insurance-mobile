# Native Development

ONE FC Native(Expo) 로컬 개발·실기기 QA 가이드. **비밀 값은 문서에 적지 않습니다.**

## 패키지·앱 정체성

| 환경 | 표시 이름 | Android package | URL scheme |
|------|-----------|-----------------|------------|
| DEV | ONE FC DEV | `com.onefc.app.dev` | `onefc-dev` |
| PROD | ONE FC | `com.onefc.app` | `onefc` |

정의: `app.identity.json`, `app.config.ts`

DEV와 PROD는 **동시 설치 가능**하도록 package·scheme·displayName을 분리합니다.

## API (DEV)

- 기본 DEV API: `https://insurance-dev.up.railway.app` (`src/config/environment.ts`)
- 오버라이드: `EXPO_PUBLIC_API_BASE_URL_DEV`
- 환경 플래그: `EXPO_PUBLIC_APP_ENV=development`, EAS `APP_VARIANT=development`

로그인·세션은 SecureStore + `/api/me` 검증(`AuthProvider`). DEV 빌드는 PROD API를 기본으로 쓰지 않습니다.

## Metro

```bash
npm install
npx expo start --dev-client
```

- DEV 클라이언트(APK)가 설치된 실기기/에뮬레이터에서 연결
- Legacy WebView 앱과 **Metro 포트·패키지가 겹치지 않도록** DEV 패키지만 사용
- 타입·린트·테스트: `npm run check`

## USB / ADB (Android)

1. 기기에서 USB 디버깅 활성화
2. `adb devices` 로 연결 확인
3. DEV 앱 설치 후 실행:

```bash
adb shell monkey -p com.onefc.app.dev -c android.intent.category.LAUNCHER 1
```

UI 덤프·스크린샷(선택):

```bash
adb shell uiautomator dump /sdcard/ui.xml
adb pull /sdcard/ui.xml ./qa-screenshots/
adb exec-out screencap -p > ./qa-screenshots/screen.png
```

## Firebase (DEV Push)

- `google-services.dev.json` (또는 fallback `google-services.json`) — **저장소에 커밋하지 않음**
- EAS secret / 로컬 경로로만 제공 (`app.config.ts`의 `resolveGoogleServicesFile`)

## Google Maps (선택)

- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` 없으면 지도 화면은 설정 안내 + 목록 fallback (크래시 방지)
- 키가 있을 때만 네이티브 지도 타일·마커 활성화

## 관련 문서

- [native-release.md](./native-release.md) — 스토어·EAS
- [native-push.md](./native-push.md) — 푸시·딥링크
- [release-readiness.md](./release-readiness.md) — 릴리스 체크리스트
