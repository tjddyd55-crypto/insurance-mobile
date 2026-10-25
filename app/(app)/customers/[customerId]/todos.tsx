import { useLocalSearchParams } from 'expo-router';
import { CustomerTodosScreen } from '../../../../src/features/todos/CustomerTodosScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ customerId: string }>();
  return <CustomerTodosScreen customerId={Number(params.customerId)} />;
}
