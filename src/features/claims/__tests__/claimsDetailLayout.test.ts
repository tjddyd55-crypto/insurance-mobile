import { CLAIM_DETAIL_SECTION_TITLES } from '../claimsDetailLayout';

describe('claimsDetailLayout', () => {
  it('orders claim detail sections for mobile readability', () => {
    expect(CLAIM_DETAIL_SECTION_TITLES).toEqual([
      '청구 정보',
      '청구 내용',
      '상태 변경',
    ]);
  });
});
