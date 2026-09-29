import {
  buildCustomerListCountText,
  buildCustomerListEmptyCopy,
} from '../customerListPresentation';

describe('customer list presentation', () => {
  test('describes visible filtered customers', () => {
    expect(buildCustomerListCountText({
      visibleCount: 3,
      totalCount: 120,
      search: '김',
      filtersActive: false,
    })).toBe('검색·필터 결과: 3명');
  });

  test('describes the default list count like mobile web', () => {
    expect(buildCustomerListCountText({
      visibleCount: 688,
      totalCount: 688,
      search: '',
      filtersActive: false,
    })).toBe('검색·필터 결과: 688명');
  });

  test('distinguishes a truncated list from the server total', () => {
    expect(buildCustomerListCountText({
      visibleCount: 500,
      totalCount: 620,
      search: '',
      filtersActive: false,
    })).toBe('전체 620명 중 500명 표시');
  });

  test('uses different empty copy for no data and no matches', () => {
    expect(buildCustomerListEmptyCopy('', false)).toEqual({
      title: '등록된 고객이 없습니다',
      message: '고객 등록을 눌러 새 고객을 추가해 주세요.',
    });
    expect(buildCustomerListEmptyCopy('없는 고객', false)).toEqual({
      title: '조건에 맞는 고객이 없습니다',
      message: '검색어 또는 필터 조건을 변경하거나 초기화해 주세요.',
    });
  });
});
