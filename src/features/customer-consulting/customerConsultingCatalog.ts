/**
 * 고객 상담 메뉴.
 * 웹 `buildAppMenuForSession`에는 아직 없는 네이티브 전용 대분류다.
 * 화면은 WebView가 아니라 앱의 네이티브 라우트로 연다.
 */

export type CustomerConsultingFeatureId = 'personal-binder' | 'coverage-simulation';

export type CustomerConsultingFeature = {
  id: CustomerConsultingFeatureId;
  label: string;
  nativePath: `/customer-consulting/${string}`;
  legacyWebPath: string;
};

export const CUSTOMER_CONSULTING_SECTION_ID = 'customer-consulting';
export const CUSTOMER_CONSULTING_SECTION_LABEL = '고객 상담';

/**
 * 배치: 고객관리 다음.
 * 하위 메뉴는 내 바인더, 시뮬레이션 두 개만 둔다.
 * 시뮬레이션 진입은 보장 시뮬레이션 시나리오 선택이다.
 */
export const CUSTOMER_CONSULTING_FEATURES: readonly CustomerConsultingFeature[] = [
  {
    id: 'personal-binder',
    label: '내 바인더',
    nativePath: '/customer-consulting/personal-binders',
    legacyWebPath: '/personal-binders',
  },
  {
    id: 'coverage-simulation',
    label: '시뮬레이션',
    nativePath: '/customer-consulting/coverage-simulation',
    legacyWebPath: '/coverage-simulator',
  },
];

export function findCustomerConsultingFeature(
  featureId: CustomerConsultingFeatureId,
): CustomerConsultingFeature {
  const feature = CUSTOMER_CONSULTING_FEATURES.find((item) => item.id === featureId);
  if (!feature) {
    throw new Error(`알 수 없는 고객 상담 기능입니다: ${featureId}`);
  }
  return feature;
}
