/**
 * 고객 상담 메뉴에 올릴 기능과, 지금 앱에서 열 수 있는지.
 *
 * 웹 CRM 세션 브리지가 없고 토큰을 URL에 넣지 않으므로,
 * 웹에만 있는 기능도 여기서는 안내 화면까지만 연다.
 */

export type CustomerConsultingFeatureId = 'coverage-analysis' | 'coverage-simulation';

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
 * 소유자 요청으로 네이티브 메뉴에만 먼저 둔다.
 */
export const CUSTOMER_CONSULTING_FEATURES: readonly CustomerConsultingFeature[] = [
  {
    id: 'coverage-analysis',
    label: '보장 분석',
    nativePath: '/customer-consulting/coverage-analysis',
    legacyWebPath: '#',
    nativeImplemented: false,
    webImplemented: false,
    unavailableTitle: '보장 분석은 아직 열 수 없습니다.',
    unavailableMessage: '앱과 PC 고객관리 모두에서 연결된 화면이 없습니다.',
  },
  {
    id: 'coverage-simulation',
    label: '보장 시뮬레이션',
    nativePath: '/customer-consulting/coverage-simulation',
    legacyWebPath: '/coverage-simulator',
    nativeImplemented: false,
    webImplemented: true,
    unavailableTitle: '보장 시뮬레이션은 PC에서 이용해 주세요.',
    unavailableMessage:
      'PC의 ONE FC에서 이용할 수 있습니다. 앱은 웹 로그인 세션과 연결되어 있지 않아 이 화면을 열지 않습니다.',
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
