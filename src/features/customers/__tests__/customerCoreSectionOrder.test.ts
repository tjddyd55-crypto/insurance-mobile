import { CUSTOMER_DETAIL_CORE_SECTION_TEST_IDS } from '../customerCoreSectionOrder'

describe('customerCoreSectionOrder', () => {
  it('고객 상세 핵심 section 순서를 고정한다', () => {
    expect(CUSTOMER_DETAIL_CORE_SECTION_TEST_IDS).toEqual([
      'customer-detail-section-basic',
      'customer-detail-section-vehicle',
      'customer-detail-section-linked-customers',
      'customer-detail-section-business',
      'customer-detail-section-fire-insurance',
      'customer-detail-section-special-dates',
      'customer-detail-section-consultation',
    ])
  })
})
