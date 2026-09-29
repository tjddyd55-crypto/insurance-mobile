import { useLocalSearchParams } from 'expo-router';

import { CoverageSimulationListScreen } from '../../../../../src/features/coverage-simulator/CoverageSimulationListScreen';

export default function Screen() {
  const { diseaseType } = useLocalSearchParams<{ diseaseType: string }>();
  return <CoverageSimulationListScreen diseaseType={String(diseaseType ?? '')} />;
}
