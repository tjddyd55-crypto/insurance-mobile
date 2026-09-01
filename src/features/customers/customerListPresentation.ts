export type CustomerListSummaryInput = {
  visibleCount: number;
  totalCount: number;
  search: string;
  favoritesOnly: boolean;
};

export function buildCustomerListCountText(input: CustomerListSummaryInput): string {
  const filtered = input.search.trim().length > 0 || input.favoritesOnly;
  if (filtered) {
    return `검색·필터 결과: ${input.visibleCount}명`;
  }
  if (input.totalCount > input.visibleCount) {
    return `전체 ${input.totalCount}명 중 ${input.visibleCount}명 표시`;
  }
  return `전체 고객: ${input.visibleCount}명`;
}

export function buildCustomerListEmptyCopy(
  search: string,
  favoritesOnly: boolean,
): { title: string; message: string } {
  if (search.trim() || favoritesOnly) {
    return {
      title: '검색 결과가 없습니다',
      message: '검색어 또는 중요 고객 조건을 변경해 주세요.',
    };
  }
  return {
    title: '등록된 고객이 없습니다',
    message: '고객 등록을 눌러 새 고객을 추가해 주세요.',
  };
}
