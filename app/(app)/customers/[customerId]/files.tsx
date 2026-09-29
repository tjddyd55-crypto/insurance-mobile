import { useLocalSearchParams } from 'expo-router';
import { CustomerFilesScreen } from '../../../../src/features/customer-workspace/CustomerFilesScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ customerId: string }>();
  return <CustomerFilesScreen customerId={Number(params.customerId)} />;
}
