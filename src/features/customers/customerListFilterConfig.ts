/** Web SSOT와 동일한 고객 목록 정렬/필터 옵션 (Native UI용) */

export type CustomerListSortValue =
  | ''
  | 'createdDesc'
  | 'nameAsc'
  | 'lastConsultDesc'
  | 'lastConsultAsc'
  | 'noConsultFirst';

export const CUSTOMER_LIST_SORT_OPTIONS: Array<{ value: CustomerListSortValue; label: string }> = [
  { value: '', label: '기본(마지막 상담일)' },
  { value: 'createdDesc', label: '최근 등록순' },
  { value: 'nameAsc', label: '이름순' },
  { value: 'lastConsultDesc', label: '마지막 상담일 최신순' },
  { value: 'lastConsultAsc', label: '마지막 상담일 오래된순' },
  { value: 'noConsultFirst', label: '상담 없음 우선' },
];

export type CustomerQuickSortType = null | 'age' | 'car' | 'recent';

export const CUSTOMER_QUICK_SORT_OPTIONS: Array<{
  value: CustomerQuickSortType;
  label: string;
}> = [
  { value: null, label: '빠른 정렬 없음' },
  { value: 'age', label: '보험나이순' },
  { value: 'car', label: '자동차 갱신일순' },
  { value: 'recent', label: '최근 상담순' },
];

export type CustomerConsultationFilterValue = '' | 'none' | 'has' | 'no_since';

export const CUSTOMER_CONSULTATION_FILTER_OPTIONS: Array<{
  value: CustomerConsultationFilterValue;
  label: string;
}> = [
  { value: '', label: '전체' },
  { value: 'has', label: '상담 있음' },
  { value: 'none', label: '상담 없음' },
  { value: 'no_since', label: '선택 날짜 이후 상담 없음' },
];

export const CUSTOMER_INFLOW_SOURCE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '전체' },
  { value: '미지정', label: '미지정' },
  { value: 'DB수급', label: 'DB수급' },
  { value: '소개', label: '소개' },
  { value: '지인', label: '지인' },
  { value: '기존고객', label: '기존고객' },
  { value: '광고/마케팅', label: '광고/마케팅' },
  { value: '기타', label: '기타' },
  { value: '이관고객', label: '이관고객' },
];

export const CUSTOMER_GENDER_FILTER_OPTIONS: Array<{
  value: '' | 'male' | 'female';
  label: string;
}> = [
  { value: '', label: '전체' },
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
];
