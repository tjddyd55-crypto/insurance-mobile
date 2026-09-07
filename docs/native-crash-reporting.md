# Native Crash Reporting (준비)

설치는 **이 Phase에서 하지 않습니다.** v1.0.3 이후 별도 Phase에서 1종만 도입.

## 권장: Firebase Crashlytics

| 기준 | Crashlytics | Sentry |
|------|-------------|--------|
| Native (Expo/RN) | FCM·`google-services`와 동일 Firebase 프로젝트로 자연스럽게 연결 | `@sentry/react-native` + EAS source map upload 설정 필요 |
| Web (Vite) | 별도 Web SDK 또는 미연동 | `@sentry/react` 단일 스택으로 Web/Electron 통합 용이 |
| Backend (Node) | Cloud Logging + Error Reporting (간접) | `@sentry/node`로 API·worker 통합 |
| Expo / EAS | `expo-firebase-crashlytics` 또는 config plugin 경로 | 공식 Expo 가이드·EAS hook 성숙 |
| Source maps | Firebase Console + Gradle/EAS 심볼 업로드 | Sentry release + artifact upload 자동화 강함 |
| Release tracking | Firebase App + versionCode | Sentry release/environment 태깅 우수 |
| 비용 | Spark/Blaze 사용량 기반, crash 무료 tier | 이벤트·seat 기반, 멀티 플랫폼 시 증가 |
| 운영 난이도 | Android 중심 팀·기존 Firebase 운영자에게 낮음 | Web+Native+Backend 단일 대시보드에 유리 |

## 판정

- **Native v1.0.3 우선순위(Android, Firebase 이미 사용)** → **Crashlytics**
- Web/Electron·백엔드까지 **단일 observability 스택**이 필요하면 **Sentry** 재검토

## 도입 Phase (별도) 체크리스트

1. DEV(`com.onefc.app.dev`) / PROD 분리 Firebase 앱
2. EAS build hook — Android mapping / iOS dSYM
3. `AppErrorBoundary` + global handler 연동 (PII scrub)
4. Web은 Crashlytics 미지원 시 Sentry hybrid 또는 Web만 Sentry
5. Production rollout **전** Internal track crash-free 목표 설정

## 관련

- [native-release.md](./native-release.md)
- [native-push.md](./native-push.md)
