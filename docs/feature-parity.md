# Native Feature Parity Matrix

Source of truth for Phase 1 migration tracking.
Menu labels/order mirrored from insurance `buildAppMenuForSession` (USER).

| Primary Menu | Secondary Menu | Web Path | Native Path | Source Component | API | Implementation Mode | Status | QA |
|---|---|---|---|---|---|---|---|---|
| 할일 및 알림 | 오늘의 TA | /ta-call | /ta-call | TaCallScreen / TaCallSettingsScreen | GET/PATCH /api/ta/settings, GET /api/ta/week, PATCH assignment status | NATIVE | IN_PROGRESS | Android: mission/week nav/day expand/customer/call/status/settings |
| 할일 및 알림 | 할일 | /todos | /todos | TodosScreen / TodoFormScreen | GET/POST /api/todos, PATCH/DELETE /api/todos/:id, PATCH complete/reopen | NATIVE | IN_PROGRESS | Android: filters/list/create/edit/delete/complete/reopen/customer link |
| 할일 및 알림 | 메모 | /memo | /memo | MemosScreen / MemoFormScreen | GET/POST /api/memo, PUT/DELETE /api/memo/:id | NATIVE | IN_PROGRESS | Android: list/search/create/edit/delete/unsaved guard |
| 할일 및 알림 | 알림 | /notifications | /notifications | NotificationsScreen / NotificationSettingsScreen | GET/PATCH /api/notifications, read/dismiss/read-all/settings | NATIVE | IN_PROGRESS | Android: active/confirmed/grouping/read/confirm/customer link/settings |
| 고객관리 | 고객리스트 | /customers | /customers | CustomersScreen | GET/POST /api/customers, GET/PUT/DELETE /api/customers/:id | NATIVE | IN_PROGRESS | Android: list/search/favorite/detail/create/edit/delete/call/SMS |
| 고객관리 | 고객 지도 | /customers/map | /customers/map | CustomerMapScreen | GET /api/customers/map | NATIVE | IN_PROGRESS | Android: native map/markers/grouping/search/favorite/radius/unmapped list; Google Maps client key required |
| 고객관리 | 카드 수납 | /premium-payments | /premium-payments | PremiumPaymentsScreen | 카드·수납대상 CRUD, 월 완료/재처리, 민감정보 마스킹·명시적 복사 | NATIVE | NATIVE | 카드 원문 기기 저장·로그 금지 |
| 고객관리 | 고객소식지 | /claim-requests?claimTab=news-all | /claim-requests/news | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 고객관리 | 청구관리 | /claim-requests | /claim-requests | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 소식지 | 원수사소식지 | /portal/newsletters | /portal/newsletters | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 소식지 | 손해사정사 소식지 | /portal/adjuster-news | /portal/adjuster-news | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 신청서 | 신청서 작성 | /application/documents | /application/documents | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 신청서 | 신청서 작성내역 | /application/documents/history | /application/documents/history | LegacyWebScreen | TBD | WEBVIEW_TEMP | WEBVIEW_TEMP | |
| 신청서 | 렌트(사고대차) | # | /placeholder/rent | PlaceholderScreen | — | DISABLED | NOT_STARTED | |
| 팀관리 | 팀원리스트 | /team/members | /team/members | TeamMembersScreen | members/create/join/kick/transfer/leave/disband team APIs | NATIVE | IN_PROGRESS | Android: no-team setup/member roles/owner actions/storage |
| 팀관리 | 팀 게시판 | /team/posts | /team/posts | TeamPostsScreen | posts/comments/presigned attachment team APIs | NATIVE | IN_PROGRESS | Android: list/create/edit/notice permission/comments/image·PDF upload/open |
| 팀관리 | 팀 자료 | /team/files | /team/files | TeamFilesScreen | GET /api/teams/files, GET /api/teams/members | NATIVE | IN_PROGRESS | Android: file list/open/team storage usage |
| 업무편의 | 문자 발송 | /sms/settings | /sms/settings | SmsScreen | SMS settings/send/templates/history/campaign/opt-out APIs | NATIVE | IN_PROGRESS | Android: Aligo settings/test/balance/opt-out, guarded single send, templates, history/reservation cancel |
| 업무편의 | 원수사 연락처 | /insurance/contacts | /insurance/contacts | InsuranceContactsScreen | GET /api/company/list | NATIVE | IN_PROGRESS | Android: category/search/company/manager/call/copy |
| 업무편의 | 계정관리 | /insurance/account-credentials | /insurance/account-credentials | AccountVaultScreen | CRUD /api/user-insurer-accounts | NATIVE | IN_PROGRESS | Android: categories/create/edit/delete/masked reveal/copy; no local credential persistence |
| 업무편의 | 설계사이트 | /insurance/insurer-sites | /insurance/insurer-sites | InsurerSitesScreen | GET /api/insurer-sites | NATIVE | IN_PROGRESS | Android: life/non-life tabs/logo/sales/home/disclosure links |
| 내정보 | 내 저장공간 | /storage | /storage | StorageScreen | folders/files/quota/presign/open-token storage APIs | NATIVE | IN_PROGRESS | Android: folder browse/create/rename/delete, file upload/open/rename/delete, quota |
| 내정보 | 내정보관리 | /profile | /profile | ProfileScreen | GET/PATCH /api/me, phone change verification | NATIVE | IN_PROGRESS | Android: identity/name/verified phone/password reset entry |
| 내정보 | 구독 및 결제 | /billing/checkout | /billing | PlaceholderScreen | (no Toss in M1) | NATIVE | NOT_STARTED | |
| 내정보 | 문의요청 | /feature-request | /feature-request | FeatureRequestsScreen | my request CRUD/comments APIs | NATIVE | IN_PROGRESS | Android: list/create/delete/status/lazy answer loading |

## Auth (Foundation)

| Feature | Web Path | Native Path | API | Mode | Status |
|---|---|---|---|---|---|
| Login | /login | /(auth)/login | POST /api/auth/login | NATIVE | IN_PROGRESS |
| Session | — | AuthProvider | GET /api/me | NATIVE | IN_PROGRESS |
| Register entry | /register | /(auth)/register | username availability, GA validate, signup phone verify, POST /api/auth/register | NATIVE | IN_PROGRESS |
| Password reset | /password-reset | /(auth)/password-reset | /api/auth/request-password-reset-code, /api/auth/reset-password-by-sms | NATIVE | IN_PROGRESS |
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
