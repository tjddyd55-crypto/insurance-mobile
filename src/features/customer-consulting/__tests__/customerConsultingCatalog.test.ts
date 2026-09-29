import { CUSTOMER_CONSULTING_FEATURES } from '../customerConsultingCatalog';

describe('customer consulting menu', () => {
  it('exposes only the two native consulting screens', () => {
    expect(CUSTOMER_CONSULTING_FEATURES.map((feature) => feature.label)).toEqual([
      '내 바인더',
      '시뮬레이션',
    ]);
    expect(CUSTOMER_CONSULTING_FEATURES.map((feature) => feature.legacyWebPath)).toEqual([
      '/personal-binders',
      '/coverage-simulator',
    ]);
    expect(CUSTOMER_CONSULTING_FEATURES.every((feature) => feature.nativePath.startsWith('/customer-consulting/'))).toBe(true);
  });
});
