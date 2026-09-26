/**
 * 고객 상담 메뉴에 올릴 기능과, 지금 앱에서 열 수 있는지.
 *
 * 네이티브 화면은 없다. 웹에 경로가 있는 기능은 DEV WebView로 연다.
 * 세션은 localStorage에만 넣고, 토큰은 URL에 넣지 않는다.
 */

export type CustomerConsultingFeatureId = 'personal-binder' | 'coverage-simulation';

export type CustomerConsultingFeature = {
  id: CustomerConsultingFeatureId;
  label: string;
  nativePath: `/customer-consulting/${string}`;
  /** 웹 CRM에 완료된 라우트가 있을 때만 경로. 없으면 '#' */
  legacyWebPath: string;
  nativeImplemented: boolean;
  webImplemented: boolean;
  unavailableTitle: string;
  unavailableMessage: string;
};

export const CUSTOMER_CONSULTING_SECTION_ID = 'customer-consulting';
export const CUSTOMER_CONSULTING_SECTION_LABEL = '고객 상담';

/**
 * 배치: 고객관리 다음.
 * 웹 `buildAppMenuForSession`에는 아직 이 대분류가 없다.
 * 소유자 요청으로 하위 메뉴는 내 바인더, 보장 시뮬레이션 두 개만 둔다.
 */
export const CUSTOMER_CONSULTING_FEATURES: readonly CustomerConsultingFeature[] = [
  {
    id: 'personal-binder',
    label: '내 바인더',
    nativePath: '/customer-consulting/personal-binders',
    legacyWebPath: '/personal-binders',
    nativeImplemented: false,
    webImplemented: true,
    unavailableTitle: '내 바인더는 PC에서 이용해 주세요.',
    unavailableMessage: 'PC의 ONE FC에서 이용할 수 있습니다. 앱은 개발 환경에서만 이 화면을 연결합니다.',
  },
  {
    id: 'coverage-simulation',
    label: '보장 시뮬레이션',
    nativePath: '/customer-consulting/coverage-simulation',
    legacyWebPath: '/coverage-simulator',
    nativeImplemented: false,
    webImplemented: true,
    unavailableTitle: '보장 시뮬레이션은 PC에서 이용해 주세요.',
    unavailableMessage: 'PC의 ONE FC에서 이용할 수 있습니다. 앱은 개발 환경에서만 이 화면을 연결합니다.',
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
