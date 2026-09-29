import { useLocalSearchParams } from 'expo-router';

import { CoveragePdfPreviewScreen } from '../../../../../../src/features/coverage-simulator/CoveragePdfPreviewScreen';

export default function Screen() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
  return <CoveragePdfPreviewScreen scenarioId={String(scenarioId ?? '')} />;
}
