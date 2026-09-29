import { useLocalSearchParams } from 'expo-router';

import { CustomerDetailScreen } from '../../../../src/features/customers/CustomerDetailScreen';

export default function Screen() {
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  return <CustomerDetailScreen customerId={Number(customerId)} />;
}
