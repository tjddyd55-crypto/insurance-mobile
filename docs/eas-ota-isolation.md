# EAS / OTA Isolation (M1)

## Legacy WebView app (insurance/apps/mobile)

| Field | Value |
|---|---|
| EAS projectId | `46c22c3a-0cf3-4a85-b877-908dab8116fe` |
| slug | `fc-helper` |
| runtimeVersion | `"production"` (string) |
| updates.url | `https://u.expo.dev/46c22c3a-0cf3-4a85-b877-908dab8116fe` |
| production channel | `main` |
| package | `com.onefc.app` |

## Risk if reused blindly

Publishing an OTA update from this Native repo to the same projectId + runtimeVersion `"production"` + channel `main` could deliver a Native bundle to the existing production WebView app.

## M1 decision

1. **Do not embed** legacy `projectId` in Native app config.
2. **Do not** run `eas init` against the legacy project without explicit approval.
3. Native `runtimeVersion` uses `appVersion` policy (not the string `"production"`).
4. Native channels use `native-development` / `native-preview` only.
5. `updates.enabled: false` in M1 app config.
6. **Production OTA publish: forbidden** in M1.

## Development identity

Development Client, local Android QA, preview, and the compatibility `device` profile all use
one application identity. They must not create an additional Native-only installation:

| Field | Development value |
|---|---|
| App name | `ONE FC DEV` |
| Android / iOS id | `com.onefc.app.dev` |
| Scheme | `onefc-dev` |
| EAS profile | `development`, `preview`, `device` |
| Channel | `native-development` (`preview` keeps `native-preview`) |

`APP_VARIANT=device` and `APP_VARIANT=local-device` remain backwards-compatible aliases for
`development`; both resolve to the same DEV identity.

## Recommended follow-up (post-M1 approval)

- Option A (safer): create a **new** EAS project for Native; keep legacy project for WebView until cutover.
- Option B: reuse one project only after channel + runtimeVersion hard isolation is proven, with separate runtimes forever for WebView vs Native until WebView is retired.
