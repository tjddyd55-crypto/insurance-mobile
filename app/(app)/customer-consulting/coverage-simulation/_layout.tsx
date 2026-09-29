import { Slot } from 'expo-router';

import { CoverageCustomerProvider } from '../../../../src/features/coverage-simulator/CoverageCustomerContext';

export default function CoverageSimulationLayout() {
  return (
    <CoverageCustomerProvider>
      <Slot />
    </CoverageCustomerProvider>
  );
}
