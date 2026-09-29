import {
  CUSTOMER_GENDER_FORM_OPTIONS,
  CUSTOMER_WORKSPACE_NAVIGATION_VARIANT,
  resolveChoiceButtonVariant,
  resolveSegmentSelectedVariant,
} from '../customerFormChoices';

describe('customerFormChoices', () => {
  it('업무 바로가기는 navigation secondary variant를 사용한다', () => {
    expect(CUSTOMER_WORKSPACE_NAVIGATION_VARIANT).toBe('secondary');
  });

  it('성별 옵션은 남/여만 제공한다', () => {
    expect(CUSTOMER_GENDER_FORM_OPTIONS).toEqual([
      { value: 'male', label: '남' },
      { value: 'female', label: '여' },
    ]);
  });

  it('placeholder 선택값은 selected green을 사용하지 않는다', () => {
    expect(resolveChoiceButtonVariant('', '')).toBe('secondary');
    expect(resolveChoiceButtonVariant('', 'SKT')).toBe('secondary');
  });

  it('실제 선택값만 selected variant를 사용한다', () => {
    expect(resolveChoiceButtonVariant('SKT', 'SKT')).toBe('selected');
    expect(resolveChoiceButtonVariant('KT', 'SKT')).toBe('secondary');
  });

  it('segmented choice는 선택된 값만 selected variant를 사용한다', () => {
    expect(resolveSegmentSelectedVariant('male', 'male')).toBe('selected');
    expect(resolveSegmentSelectedVariant('female', 'male')).toBe('secondary');
    expect(resolveSegmentSelectedVariant('male', '')).toBe('secondary');
  });
});
