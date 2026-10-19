import { CUSTOMER_CONSULTING_FEATURES } from '../customerConsultingCatalog';

describe('customer consulting menu', () => {
  it('exposes the three native consulting screens in web order', () => {
    expect(CUSTOMER_CONSULTING_FEATURES.map((feature) => feature.label)).toEqual([
      '내 바인더',
      '공유 바인더',
      '시뮬레이션',
    ]);
    expect(CUSTOMER_CONSULTING_FEATURES.map((feature) => feature.legacyWebPath)).toEqual([
      '/personal-binders',
      '/personal-binders/shared',
      '/coverage-simulator',
    ]);
    expect(CUSTOMER_CONSULTING_FEATURES.every((feature) => feature.nativePath.startsWith('/customer-consulting/'))).toBe(true);
  });
});
