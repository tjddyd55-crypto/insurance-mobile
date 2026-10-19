import { useLocalSearchParams } from 'expo-router';

import { ConsultationLeadDetailScreen } from '../../../src/features/consultation-leads/ConsultationLeadDetailScreen';

export default function Screen() {
  const { leadId } = useLocalSearchParams<{ leadId: string }>();
  return <ConsultationLeadDetailScreen leadId={String(leadId ?? '')} />;
}
