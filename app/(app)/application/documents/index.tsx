import { useLocalSearchParams } from 'expo-router';
import { ApplicationDocumentsScreen } from '../../../../src/features/application-documents/ApplicationDocumentsScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ sourceIssuanceId?: string }>();
  const sourceId = Number(params.sourceIssuanceId);
  return <ApplicationDocumentsScreen sourceIssuanceId={Number.isInteger(sourceId) && sourceId > 0 ? sourceId : null} />;
}
