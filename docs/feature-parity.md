# Native Feature Parity Matrix

Source of truth for Phase 1 migration tracking.
Menu labels/order mirrored from insurance `buildAppMenuForSession` (USER).

| Primary Menu | Secondary Menu | Web Path | Native Path | Source Component | API | Implementation Mode | Status | QA |
|---|---|---|---|---|---|---|---|---|
| 할일 및 알림 | 오늘의 TA | /ta-call | /ta-call | PlaceholderScreen | TBD | NATIVE | NOT_STARTED | |
| 할일 및 알림 | 할일 | /todos | /todos | TodosScreen / TodoFormScreen | GET/POST /api/todos, PATCH/DELETE /api/todos/:id, PATCH complete/reopen | NATIVE | IN_PROGRESS | Android: filters/list/create/edit/delete/complete/reopen/customer link |
| 할일 및 알림 | 메모 | /memo | /memo | MemosScreen / MemoFormScreen | GET/POST /api/memo, PUT/DELETE /api/memo/:id | NATIVE | IN_PROGRESS | Android: list/search/create/edit/delete/unsaved guard |
| 할일 및 알림 | 알림 | /notifications | /notifications | NotificationsScreen / NotificationSettingsScreen | GET/PATCH /api/notifications, read/dismiss/read-all/settings | NATIVE | IN_PROGRESS | Android: active/confirmed/grouping/read/confirm/customer link/settings |
| 고객관리 | 고객리스트 | /customers | /customers | CustomersScreen | GET/POST /api/customers, GET/PUT/DELETE /api/customers/:id | NATIVE | IN_PROGRESS | Android: list/search/favorite/detail/create/edit/delete/call/SMS |
| 고객관리 | 고객 지도 | /customers/map | /customers/map | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 고객관리 | 카드 수납 | /premium-payments | /premium-payments | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 고객관리 | 고객소식지 | /claim-requests?claimTab=news-all | /claim-requests/news | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 고객관리 | 청구관리 | /claim-requests | /claim-requests | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 소식지 | 원수사소식지 | /portal/newsletters | /portal/newsletters | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 소식지 | 손해사정사 소식지 | /portal/adjuster-news | /portal/adjuster-news | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 신청서 | 신청서 작성 | /application/documents | /application/documents | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 신청서 | 신청서 작성내역 | /application/documents/history | /application/documents/history | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 신청서 | 렌트(사고대차) | # | /placeholder/rent | PlaceholderScreen | — | DISABLED | NOT_STARTED | |
| 팀관리 | 팀원리스트 | /team/members | /team/members | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 팀관리 | 팀 게시판 | /team/posts | /team/posts | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 팀관리 | 팀 자료 | /team/files | /team/files | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 업무편의 | 문자 발송 | /sms/settings | /sms/settings | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 업무편의 | 원수사 연락처 | /insurance/contacts | /insurance/contacts | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 업무편의 | 계정관리 | /insurance/account-credentials | /insurance/account-credentials | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 업무편의 | 설계사이트 | /insurance/insurer-sites | /insurance/insurer-sites | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 내정보 | 내 저장공간 | /storage | /storage | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 내정보 | 내정보관리 | /profile | /profile | PlaceholderScreen | /api/me | NATIVE | NOT_STARTED | |
| 내정보 | 구독 및 결제 | /billing/checkout | /billing | PlaceholderScreen | (no Toss in M1) | NATIVE | NOT_STARTED | |
| 내정보 | 문의요청 | /feature-request | /feature-request | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |

## Auth (Foundation)

| Feature | Web Path | Native Path | API | Mode | Status |
|---|---|---|---|---|---|
| Login | /login | /(auth)/login | POST /api/auth/login | NATIVE | IN_PROGRESS |
| Session | — | AuthProvider | GET /api/me | NATIVE | IN_PROGRESS |
| Register entry | /register | /(auth)/register | POST /api/auth/register | NATIVE shell | NOT_STARTED |
| Password reset | /password-reset | /(auth)/password-reset | /api/auth/request-password-reset-code, /api/auth/reset-password-by-sms | NATIVE shell | NOT_STARTED |
| Logout | client clear | AuthProvider.logout | no dedicated server endpoint | NATIVE | IN_PROGRESS |

## Status legend

- `NOT_STARTED`
- `IN_PROGRESS`
- `PARITY`
- `WEBVIEW_TEMP`
- `PC_ONLY`
- `BLOCKED`

## Notes

- USER_MENU_FEATURE_FLAGS: electronic signature / top-level insurance claim currently off in source.
- PC_ONLY: not used for default USER mobile drawer items in current SSOT.
- Billing: M1 placeholder only — no LIVE Toss / production payment calls.
