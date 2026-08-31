import { useLocalSearchParams } from 'expo-router';
import { ClaimsScreen } from '../../../../src/features/claims/ClaimsScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ customerId: string }>();
  return <ClaimsScreen initialCustomerId={Number(params.customerId)} />;
}
