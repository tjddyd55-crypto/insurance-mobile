import { useLocalSearchParams } from 'expo-router';

import { CoverageSimulationScreen } from '../../../../../src/features/coverage-simulator/CoverageSimulationScreen';

export default function Screen() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
  return <CoverageSimulationScreen scenarioId={String(scenarioId ?? '')} />;
}
