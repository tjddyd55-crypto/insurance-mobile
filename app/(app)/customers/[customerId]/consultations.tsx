import { useLocalSearchParams } from 'expo-router';
import { CustomerConsultationsScreen } from '../../../../src/features/customer-workspace/CustomerConsultationsScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ customerId: string }>();
  return <CustomerConsultationsScreen customerId={Number(params.customerId)} />;
}
