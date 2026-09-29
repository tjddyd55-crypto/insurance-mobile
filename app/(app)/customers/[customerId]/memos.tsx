import { useLocalSearchParams } from 'expo-router';
import { CustomerMemosScreen } from '../../../../src/features/customer-workspace/CustomerMemosScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ customerId: string }>();
  return <CustomerMemosScreen customerId={Number(params.customerId)} />;
}
