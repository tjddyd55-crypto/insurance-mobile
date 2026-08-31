# Component contracts

## AppText

텍스트 계층은 `display`, `title`, `heading`, `subheading`, `body`, `bodyStrong`, `label`, `caption`, `button`으로 제한합니다. 임의 font size 대신 가장 가까운 계층을 사용합니다.

## Button

| variant | 용도 |
|---|---|
| `primary` | 화면의 대표 저장·진행 동작 |
| `secondary` | 취소·보조 동작 |
| `danger` | 삭제·연결 해제 등 위험 동작 |
| `ghost` | 시각적 우선순위가 낮은 인라인 동작 |

- 한 영역에 primary 버튼을 여러 개 두지 않습니다.
- 비동기 처리 중에는 `loading`으로 중복 실행을 차단합니다.
- 아이콘만 있는 동작은 별도 IconButton 도입 전까지 Pressable을 임의 구현하지 않습니다.

## TextField

- 화면에 보이는 `label`을 기본으로 제공합니다.
- 필수 필드는 `required`로 표시하되 저장 시점의 유효성 검사를 대체하지 않습니다.
- `error`가 있으면 `helperText`보다 우선해 노출합니다.
- 오류는 사용자가 해결할 수 있는 한국어 문장으로 작성합니다.
- 전화번호·금액·날짜는 적절한 `keyboardType`과 정규화를 기능 계층에서 제공합니다.

## Card

| variant | 용도 |
|---|---|
| `elevated` | 독립된 주요 정보 묶음 |
| `outlined` | 반복 목록·설정 그룹 |
| `filled` | 보조 안내·선택 영역 |

Card 안에 Card를 반복 중첩하지 않습니다. 정보 계층은 Divider, Stack, heading으로 먼저 표현합니다.

## Badge

`default`, `success`, `warning`, `danger`, `info`만 사용합니다. Badge는 짧은 상태 라벨이며 문장이나 주요 동작을 담지 않습니다.

## Screen / Stack / Inline

- 화면 루트는 `Screen`을 사용해 배경·안전 영역·기본 여백을 통일합니다.
- 세로 간격은 `Stack`, 가로 정렬은 `Inline`을 사용합니다.
- 복잡한 레이아웃에서만 StyleSheet를 추가하고, 간격 값은 theme token을 사용합니다.
