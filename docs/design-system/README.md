# ONE FC Mobile Design System

이 디렉터리는 ONE FC 네이티브 앱의 시각 언어와 공통 UI 계약을 설명하는 단일 진실 원천(SSOT)입니다. 새로운 화면은 `src/design-system`의 토큰과 컴포넌트만 사용합니다.

## 목표

- 기존 `insurance/main`의 브랜드와 사용 흐름을 네이티브 환경에서 일관되게 재현합니다.
- 색상·타이포그래피·간격·모서리·상태 표현을 화면 코드에서 분리합니다.
- 디자이너가 기능 코드를 수정하지 않고 foundations/themes 계층을 검토하고 변경할 수 있게 합니다.
- 접근성, 최소 터치 영역, 오류·로딩·비활성 상태를 컴포넌트 계약으로 고정합니다.

## 구조

```text
src/design-system/
├─ foundations.ts             # 원시 값: palette, 4pt grid, type scale, radius, motion
├─ themes.ts                  # 의미 기반 light/dark 역할 토큰
├─ DesignSystemProvider.tsx   # 테마 선택 및 앱 주입
├─ components/                # 공통 네이티브 UI 컴포넌트
│  ├─ AppText.tsx
│  ├─ Badge.tsx
│  ├─ Button.tsx
│  ├─ Card.tsx
│  ├─ Layout.tsx
│  ├─ Screen.tsx
│  └─ TextField.tsx
└─ index.ts                   # 공개 API
```

`src/theme/tokens.ts`와 `src/components/{Button,Card,...}`는 M1 코드 호환을 위한 임시 facade입니다. 신규 코드는 아래처럼 공개 API에서 가져옵니다.

```tsx
import { AppText, Button, Card, Stack, useAppTheme } from '@/src/design-system'
```

## 토큰 계층

1. **Primitive (`foundations.ts`)**: `green600`, `spacing.md`처럼 맥락이 없는 원시 값입니다.
2. **Semantic (`themes.ts`)**: `primary`, `surface`, `textSecondary`, `danger`처럼 역할을 나타냅니다.
3. **Component**: Button, TextField 등이 semantic token으로 각 상태를 표현합니다.
4. **Pattern**: 기능 화면은 공통 컴포넌트를 조합하고 업무 로직만 소유합니다.

화면 코드에서 `#16a34a`, `12`, `fontSize: 15` 같은 시각 값을 직접 작성하지 않습니다. 예외가 필요하면 먼저 재사용 가능한 semantic token인지 검토하고, 예외 사유를 코드 주석과 이 문서에 기록합니다.

## 디자이너 변경 절차

1. DEV 앱 홈의 **디자인 시스템 보기**에서 현재 컴포넌트 상태를 확인합니다.
2. 브랜드 팔레트나 스케일은 `foundations.ts`에서 변경합니다.
3. 밝은/어두운 테마의 역할 매핑은 `themes.ts`에서 변경합니다.
4. 버튼처럼 한 컴포넌트에만 적용되는 규칙은 해당 `components/*.tsx`에서 변경합니다.
5. `npm run check`를 실행하고 갤러리에서 light/dark, disabled, error, loading 상태를 확인합니다.
6. 실제 기능 화면에서 긴 한국어, 큰 글자, 키보드, Android 뒤로가기를 검증합니다.

## 변경 경계

- 기능 화면에서 primitive palette를 직접 import하지 않습니다.
- 색 이름이 아니라 역할 이름을 사용합니다. `green600` 대신 `primary`를 사용합니다.
- 터치 가능한 컨트롤은 기본 44px 이상을 유지합니다.
- 삭제·결제 등 위험 동작은 `danger` 의미를 사용하고 명시적 확인을 거칩니다.
- 폼/확인 다이얼로그는 backdrop으로 닫히지 않습니다.
- 색만으로 상태를 전달하지 않고 라벨·아이콘·보조 문구를 함께 제공합니다.
- 새 변형을 추가할 때 기본/pressed/disabled/loading/error 상태를 함께 설계합니다.

## 갤러리

DEV 앱에서 `/design-system` route로 접근합니다. 운영 앱에서는 메뉴에 노출하지 않으며 DEV 환경에서만 전체 갤러리를 렌더링합니다.

갤러리는 다음을 시각 검수합니다.

- light/dark/system theme
- semantic color swatch
- typography hierarchy
- button variants와 상태
- badge tone
- TextField 기본·오류·비활성 상태
- spacing scale

## 현 상태와 이관 정책

M1 foundation 화면 일부는 `src/theme/tokens.ts` 호환 facade를 사용합니다. 기능을 네이티브화할 때 해당 화면을 `src/design-system` 공개 API로 함께 이관합니다. dark theme는 디자인 시스템과 갤러리에서 검증 가능하지만, 모든 레거시 foundation 화면 이관이 끝날 때까지 제품 기본값은 light입니다.
