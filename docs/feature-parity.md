# Native Feature Parity Matrix

Source of truth for native migration tracking. Code parity was audited against insurance `main`
at `7efeb03a1959c7e119eb7074346b38a6c5be873f`.
Menu labels/order mirror insurance `buildAppMenuForSession` (USER).

| Primary Menu | Secondary Menu | Web Path | Native Path | Source Component | API | Implementation Mode | Status | QA |
|---|---|---|---|---|---|---|---|---|
| 할일 및 알림 | 오늘의 TA | /ta-call | /ta-call | TaCallScreen / TaCallSettingsScreen | GET/PATCH /api/ta/settings, GET /api/ta/week, PATCH assignment status | NATIVE | PARITY | Device QA pending: mission/week nav/day expand/customer/call/status/settings |
| 할일 및 알림 | 할일 | /todos | /todos | TodosScreen / TodoFormScreen | GET/POST /api/todos, PATCH/DELETE /api/todos/:id, PATCH complete/reopen | NATIVE | PARITY | Device QA pending: filters/list/create/edit/delete/complete/reopen/customer link |
| 할일 및 알림 | 메모 | /memo | /memo | MemosScreen / MemoFormScreen | GET/POST /api/memo, PUT/DELETE /api/memo/:id | NATIVE | PARITY | Device QA pending: list/search/create/edit/delete/unsaved guard |
| 할일 및 알림 | 알림 | /notifications | /notifications | NotificationsScreen / NotificationSettingsScreen | GET/PATCH /api/notifications, read/dismiss/read-all/settings | NATIVE | PARITY | Device QA pending: active/confirmed/grouping/read/confirm/customer link/settings |
| 고객관리 | 고객리스트 | /customers | /customers | CustomersScreen | GET/POST /api/customers, GET/PUT/DELETE /api/customers/:id | NATIVE | PARITY | Device QA pending: list/search/favorite/detail/create/edit/delete/call/SMS |
| 고객관리 | 고객 지도 | /customers/map | /customers/map | CustomerMapScreen | GET /api/customers/map | NATIVE | PARITY | Device QA pending: map/markers/search/radius; Google Maps client key required |
| 고객관리 | 카드 수납 | /premium-payments | /premium-payments | PremiumPaymentsScreen | 카드·수납대상 CRUD, 월 완료/재처리, 민감정보 마스킹·명시적 복사 | NATIVE | NATIVE | 카드 원문 기기 저장·로그 금지 |
| 고객관리 | 고객소식지 | /claim-requests?claimTab=news-all | /claim-requests/news | CustomerNewsScreen | 전체/개인 게시·앱알림 확인·첨부·수정·삭제·댓글 | NATIVE | NATIVE | 이미지/PDF 10MB, 외부 알림 확인 필수 |
| 고객관리 | 청구관리 | /claim-requests | /claim-requests | ClaimsScreen | 고객연결 링크·청구 목록/상세·첨부 열기·상태/이력·확인 후 알림톡 | NATIVE | NATIVE | 외부 발송은 사용자 확인 필수 |
| 소식지 | 원수사소식지 | /portal/newsletters | /portal/newsletters | NewslettersScreen | 보험사 필터·검색·상세·이미지/첨부/외부링크 | NATIVE | NATIVE | 서버 HTML은 안전한 일반 텍스트로 렌더링 |
| 소식지 | 손해사정사 소식지 | /portal/adjuster-news | /portal/adjuster-news | NewslettersScreen | 채널 분리·검색·상세·이미지/첨부/외부링크 | NATIVE | NATIVE | LOSS_ADJUSTER 채널 고정 |
| 신청서 | 신청서 작성 | /application/documents | /application/documents | ApplicationDocumentsScreen | 동적 템플릿·고객 자동매핑·필수값 검증·PDF 발급/공유 | NATIVE | NATIVE | 발급 시 서버 이력 생성 |
| 신청서 | 신청서 작성내역 | /application/documents/history | /application/documents/history | ApplicationHistoryScreen | 검색·원본 PDF 공유·입력값 불러오기/재발급 | NATIVE | NATIVE | Expo FileSystem 임시 캐시 사용 |
| 신청서 | 렌트(사고대차) | # | /placeholder/rent | PlaceholderScreen | — | DISABLED | NOT_STARTED | |
| 팀관리 | 팀원리스트 | /team/members | /team/members | TeamMembersScreen | members/create/join/kick/transfer/leave/disband team APIs | NATIVE | PARITY | Device QA pending: setup/member roles/owner actions/storage |
| 팀관리 | 팀 게시판 | /team/posts | /team/posts | TeamPostsScreen | posts/comments/presigned attachment team APIs | NATIVE | PARITY | Device QA pending: CRUD/notice/comments/image·PDF upload/open |
| 팀관리 | 팀 자료 | /team/files | /team/files | TeamFilesScreen | GET /api/teams/files, GET /api/teams/members | NATIVE | PARITY | Device QA pending: file list/open/team storage usage |
| 업무편의 | 문자 발송 | /sms/settings | /sms/settings | SmsScreen | SMS settings/send/templates/history/campaign/opt-out APIs | NATIVE | PARITY | Device QA pending; real send requires explicit confirmation |
| 업무편의 | 원수사 연락처 | /insurance/contacts | /insurance/contacts | InsuranceContactsScreen | GET /api/company/list | NATIVE | PARITY | Device QA pending: category/search/call/copy |
| 업무편의 | 계정관리 | /insurance/account-credentials | /insurance/account-credentials | AccountVaultScreen | CRUD /api/user-insurer-accounts | NATIVE | PARITY | Device QA pending; no local credential persistence |
| 업무편의 | 설계사이트 | /insurance/insurer-sites | /insurance/insurer-sites | InsurerSitesScreen | GET /api/insurer-sites | NATIVE | PARITY | Device QA pending: tabs/logo/external links |
| 내정보 | 내 저장공간 | /storage | /storage | StorageScreen | folders/files/quota/presign/open-token storage APIs | NATIVE | PARITY | Device QA pending: folder/file lifecycle and quota |
| 내정보 | 내정보관리 | /profile | /profile | ProfileScreen | GET/PATCH /api/me, phone change verification | NATIVE | PARITY | Device QA pending: profile/verified phone/password reset entry |
| 내정보 | 구독 및 결제 | /billing/checkout | /billing | BillingScreen | 상태·견적·쿠폰·Toss 카드인증·결제·주기변경·해지/재개·내역 | NATIVE | NATIVE | 결제사 입력은 격리 WebView, 모든 상태변경 확인 필수 |
| 내정보 | 문의요청 | /feature-request | /feature-request | FeatureRequestsScreen | my request CRUD/comments APIs | NATIVE | PARITY | Device QA pending: list/create/delete/status/answer loading |

## Auth (Foundation)

| Feature | Web Path | Native Path | API | Mode | Status |
|---|---|---|---|---|---|
| Login | /login | /(auth)/login | POST /api/auth/login | NATIVE | PARITY |
| Session | — | AuthProvider | GET /api/me | NATIVE | PARITY |
| Register entry | /register | /(auth)/register | username availability, GA validate, signup phone verify, POST /api/auth/register | NATIVE | PARITY |
| Password reset | /password-reset | /(auth)/password-reset | /api/auth/request-password-reset-code, /api/auth/reset-password-by-sms | NATIVE | PARITY |
| Logout | client clear | AuthProvider.logout | no dedicated server endpoint | NATIVE | PARITY |

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
- `PARITY` means the native code/API contract is implemented and automated checks pass; it does not claim physical-device or production mutation verification.
- Rent remains disabled because the source menu itself exposes no active route.
- Billing uses a narrowly scoped Toss authentication WebView only; normal product screens are native.
- No production SMS, Alimtalk, payment, database mutation, OTA publish, or store release was executed during automated verification.
- 2026-09-01 physical-device read-only smoke passed for every active USER menu screen against the production API. Production mutation paths remain deliberately unexecuted.
- A missing Google Maps build key degrades to an explicit setup notice plus usable customer list; signed release builds must inject the key to activate the native map.
- Team members/posts/files treat the source API's no-membership 400 as a normal setup/empty state rather than an application error.
