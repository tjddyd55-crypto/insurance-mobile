import { CUSTOMER_MOBILE_CARRIER_OPTIONS } from '../customerCarrier';
import { CUSTOMER_INFLOW_SOURCE_OPTIONS } from '../customerInflowSource';
import {
  CUSTOMER_GENDER_FORM_OPTIONS,
  resolveSegmentSelectedVariant,
} from '../customerFormChoices';

describe('customer form select controls', () => {
  it('통신사 옵션은 SelectField용 enum SSOT를 유지한다', () => {
    expect(CUSTOMER_MOBILE_CARRIER_OPTIONS[0]).toEqual({
      value: '',
      label: '통신사를 선택해 주세요',
    });
    expect(CUSTOMER_MOBILE_CARRIER_OPTIONS.map((option) => option.value)).toEqual([
      '',
      'SKT',
      'KT',
      'LG_U_PLUS',
      'SKT_MVNO',
      'KT_MVNO',
      'LG_U_PLUS_MVNO',
    ]);
  });

  it('유입경로는 4개 이상이라 SelectField 대상이다', () => {
    expect(CUSTOMER_INFLOW_SOURCE_OPTIONS.length).toBeGreaterThanOrEqual(4);
  });

  it('성별 selected는 filled primary가 아닌 selected outline semantic을 사용한다', () => {
    expect(CUSTOMER_GENDER_FORM_OPTIONS).toHaveLength(2);
    expect(resolveSegmentSelectedVariant('male', 'male')).toBe('selected');
    expect(resolveSegmentSelectedVariant('female', 'male')).toBe('secondary');
  });
});
