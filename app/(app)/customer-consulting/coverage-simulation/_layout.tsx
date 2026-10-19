import { Stack } from 'expo-router';

import { CoverageCustomerProvider } from '../../../../src/features/coverage-simulator/CoverageCustomerContext';

/** 보장 시뮬레이션 화면들은 이 섹션 전용 Stack 에서 push/pop 한다(다른 상담 섹션과 기록을 섞지 않는다). */
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function CoverageSimulationLayout() {
  return (
    <CoverageCustomerProvider>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />
    </CoverageCustomerProvider>
  );
}
