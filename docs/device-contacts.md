# 휴대폰 연락처

고객리스트와 분리된 네이티브 화면이다. 기기 주소록을 서버에 올리지 않고, 이미 있는 고객 목록의 전화번호와 기기 안에서만 대조한다.

## 구조

- `deviceContactsSource` — expo-contacts 57 `Contact.getAllDetails` 로 주소록을 페이지 단위로 읽는다. 쓰기 API는 호출하지 않는다.
- `deviceContactCustomerIndex` — 기존 `GET /api/customers?limit=2000` 한 번. 응답에서 `id` / `name` / `phone` 만 인덱스로 남긴다.
- `deviceContactMatch` — `Map<normalizedPhone, customer[]>` 대조. 화면과 무관하다. 이후 수신전화 표시나 상담 보조는 이 함수를 재사용하면 되고, 이번 변경에는 그 연결을 넣지 않았다.
- `deviceContactSession` — 최소 필드 캐시. 토큰은 저장하지 않는다. 로그아웃과 로그인(계정 전환) 때 캐시를 지운다.
- 고객 등록은 기존 `/customers/new` 다. `name`, `phone`, `company`, `source=contact` 만 넘긴다. 회사명은 기존 직업란에 미리 채운다. DB 컬럼은 추가하지 않는다. 저장은 사용자가 고객 등록을 누를 때만 일어난다.

## 전화번호

CRM 기준은 숫자만 남기는 것이다.

- `insurance` `server/lib/phoneNormalize.js` `normalizeKrMobile`
- `insurance` `src/lib/phoneNormalize.ts`
- 고객 검색 SQL `regexp_replace(..., '\\D', '', 'g')`

기기 연락처의 `+82 10 1234 5678` 은 숫자화 뒤 `01012345678` 로 접어 국내 저장 값과 맞춘다. 고객 레코드의 저장 형식은 바꾸지 않는다.

전화번호가 없거나, 숫자화 후 8자리 미만·15자리 초과인 연락처는 목록에서 제외한다.

## 권한

Android 는 `READ_CONTACTS` 만 추가한다. `expo-contacts` 가 `WRITE_CONTACTS` 를 넣으면 `plugins/withContactsReadOnly.js` 가 `tools:node="remove"` 로 머지에서 뺀다. USER 메뉴 항목은 `USER_MENU_FEATURE_FLAGS.deviceContacts = false` 로 숨긴다. `/device-contacts` 로 직접 들어오면 목록 대신 준비 중 안내와 뒤로 가기만 보여 준다.

쓰지 않는 권한: `WRITE_CONTACTS`, `CALL_PHONE`, `SEND_SMS`, `READ_SMS`, `READ_CALL_LOG`.

전화는 `tel:`, 문자는 `sms:` 로 시스템 앱만 연다. 자동 발송과 대량 발송은 없다.

iOS 는 빌드하지 않는다. `NSContactsUsageDescription` 은 같은 문구로 설정만 해 두었다.

## 고객 인덱스 상한

서버 `GET /api/customers` 는 `limit` 최대 2000 이고 오프셋이 없다. 앱의 고객리스트와 같은 한 번 조회를 쓴다. 별도 일괄 대조 API 는 만들지 않았다. `total` 이 받은 행보다 크면 화면에 그 사실만 알린다.

## 단체문자

`sms:` 에 수신자를 여러 명 넣는 동작은 기기마다 달라 이번에 넣지 않았다. `SEND_SMS` 로 직접 보내지 않는다. 여러 명에게 보내려면 연락처를 하나씩 열어 시스템 문자 앱을 쓴다.

## Play 데이터 보안과 개인정보 처리방침

스토어 데이터 보안 양식에 적을 내용:

- 수집 데이터: 연락처 (이름, 전화번호, 회사명)
- 수집 여부: 예. 기기 안에서만 처리
- 공유: 아니오. 서버·제3자에 주소록을 업로드하지 않음
- 목적: 앱 기능 (이미 등록된 고객 번호와 대조)
- 저장: 앱 캐시. 로그아웃·계정 전환 시 삭제. 계정 키는 사용자 id 와 GA id
- 필수 여부: 아니오. 권한을 거절해도 다른 메뉴는 동작

개인정보 처리방침에 넣을 문장:

> ONE FC 앱의 연락처 메뉴는 휴대폰에 저장된 연락처를 고객 전화번호와 대조하기 위해 연락처 접근 권한(READ_CONTACTS)을 사용합니다. 주소록은 서버에 업로드하거나 별도 연락처 데이터베이스에 저장하지 않으며, 로그아웃하거나 계정을 바꾸면 기기의 대조 캐시를 삭제합니다. 전화와 문자는 기기의 기본 앱으로만 연결합니다.

권한 설명(시스템 대화상자·설정 화면):

> 휴대폰 연락처를 ONE FC에서 확인하려면 연락처 접근 권한이 필요합니다.

## 배포

`expo-contacts` 네이티브 모듈과 `READ_CONTACTS` 가 추가되므로 OTA 로 반영할 수 없다. 스토어 빌드가 필요하다. 버전 코드는 이 변경에서 올리지 않는다.
