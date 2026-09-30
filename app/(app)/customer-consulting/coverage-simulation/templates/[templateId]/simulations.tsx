import { useLocalSearchParams } from 'expo-router';

import { CoverageTemplateSimulationListScreen } from '../../../../../../src/features/coverage-simulator/CoverageTemplateSimulationListScreen';

export default function Screen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  return <CoverageTemplateSimulationListScreen templateId={String(templateId ?? '')} />;
}
