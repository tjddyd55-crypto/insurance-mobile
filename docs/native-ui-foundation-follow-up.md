# Native UI foundation follow-up

이 문서는 UI foundation 커밋에서 의도적으로 제외한 기능 parity와 후속 migration 범위를 기록한다.
운영 Web SSOT는 `C:\workspace\insurance`이며 이 저장소에서는 수정하지 않는다.

## Function parity backlog

### P0 — FUNCTION_PARITY_BILLING_ENTITLEMENT

- 서버 `isEntitled`가 없을 때도 운영 Web과 동일한 KST 기준으로 유효 trial 기간을 판정한다.
- status 문자열이나 결제 credential 존재 여부만으로 entitlement를 결정하지 않는다.
- 무료기간 사용자의 CRM 접근과 결제 강제 방지를 회귀 테스트로 고정한다.

### P0 — FUNCTION_PARITY_MENU

- `buildAppMenuForSession`의 role, dynamic newsletter, team owner, expired subscription,
  public account, billing visibility 정책을 Native 메뉴에 반영한다.
- 이번 UI foundation에서는 `USER_APP_MENU`의 순서·명칭·이동 동작을 변경하지 않는다.

### P1 — FUNCTION_PARITY_CUSTOMER

- 고객 검색과 실제 filter/sort/select 조건을 운영 Web과 대조한다.
- 고객등록 링크의 복사·문자·공유 contract를 별도 feature 변경으로 검증한다.
- 고객상세 contextual action과 목록 카드 확장 동작의 누락 범위를 확정한다.
- 안내 문구만 표시하는 필터/엑셀 버튼은 parity 완료로 판정하지 않는다.
- `listCustomers` 500→2000 변경은 pagination/server-side search 검토 전 확정하지 않는다.

### P1 — FUNCTION_PARITY_BILLING_NAVIGATION

- BillingStatusPill의 결제 화면 이동은 UI primitive와 분리해 별도 구현한다.
- free-launch/store-review billing visibility 정책과 함께 검증한다.

## CustomerPicker 조사

현재 고객 선택 UI는 Claims와 Premium Payments에 중복돼 있지만 behavior가 같지 않다.

- Claims: `number | null`을 반환하며 “전체 고객 청구” 선택을 지원한다.
- Premium Payments: 전체 `CustomerRecord`를 반환하며 고객 선택이 필수다.
- query key와 조회 limit도 기능별로 다르다.

따라서 이번 단계에서는 통합하지 않는다. 후속 작업에서 검색 가능한 공통 list/picker shell만
공유하고 selection contract는 feature adapter로 유지한다.

## Screen primitive 조사

`src/features/**/*Screen.tsx` 36개 중 27개가 현재 `Screen`을 사용한다.
미사용 9개는 다음처럼 분류한다.

- 단순 migration 후보: `CustomerDetailScreen`, `TaCallSettingsScreen`,
  `NotificationSettingsScreen`
- 폼 전용 shell 필요: `CustomerFormScreen`, `TodoFormScreen`, `MemoFormScreen`
- Fullscreen special: `DesignSystemGalleryScreen`
- 비활성/전환용: `PlaceholderScreen`, `LegacyWebScreen`

36/36 적용을 목표로 하지 않는다. 폼은 keyboard/footer/미저장 guard 계약을 보존하는
별도 `FormScreen` 패턴이 준비된 뒤 이동한다.

## Preserved WIP boundary

- UI_PRESENTATION: AppHeader, Drawer, Login, Customer list/card, Insurance Contacts
- DESIGN_SYSTEM: foundations, themes, typography, interaction/layout/density tokens
- FUNCTION_API: customer registration link, customer list limit
- TEST: billing status pill, GA tenant label, design-system contracts
- DOC: 이 문서
- QA_ARTIFACT: 현재 없음
