/**
 * 원수사 소식지 날짜 표시 (Web `formatInsurerNewsDate.ts` 동일).
 */
const KST = 'Asia/Seoul';

const dateFmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: KST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
});

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: KST,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatKstDateDisplay(value: string, emptyLabel = ''): string {
  if (!String(value ?? '').trim()) {
    return emptyLabel;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** 상세·리스트 공통: 날짜+요일 + 시간 (KST) */
export function formatInsurerNewsDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return `${dateFmt.format(d)} ${timeFmt.format(d)}`;
}

/** 목록 카드 날짜(YYYY-MM-DD, KST) */
export function formatInsurerNewsDateLabel(iso: string): string {
  return formatKstDateDisplay(iso, '—');
}
