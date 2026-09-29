import { useLocalSearchParams } from 'expo-router';

import { CustomerCoverageSimulationsScreen } from '../../../../src/features/customer-workspace/CustomerCoverageSimulationsScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ customerId: string }>();
  return <CustomerCoverageSimulationsScreen customerId={Number(params.customerId)} />;
}
