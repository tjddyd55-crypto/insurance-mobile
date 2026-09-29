export type CustomerListSummaryInput = {
  visibleCount: number;
  totalCount: number;
  search: string;
  filtersActive: boolean;
};

export function buildCustomerListCountText(input: CustomerListSummaryInput): string {
  const filtered = input.search.trim().length > 0 || input.filtersActive;
  if (filtered) {
    return `검색·필터 결과: ${input.visibleCount}명`;
  }
  if (input.totalCount > input.visibleCount) {
    return `전체 ${input.totalCount}명 중 ${input.visibleCount}명 표시`;
  }
  return `검색·필터 결과: ${input.visibleCount}명`;
}

export function buildCustomerListEmptyCopy(
  search: string,
  filtersActive: boolean,
): { title: string; message: string } {
  if (search.trim() || filtersActive) {
    return {
      title: '조건에 맞는 고객이 없습니다',
      message: '검색어 또는 필터 조건을 변경하거나 초기화해 주세요.',
    };
  }
  return {
    title: '등록된 고객이 없습니다',
    message: '고객 등록을 눌러 새 고객을 추가해 주세요.',
  };
}
