import { useLocalSearchParams } from 'expo-router';

import { CustomerFormScreen } from '../../../../src/features/customers/CustomerFormScreen';

export default function EditCustomerRoute() {
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  return <CustomerFormScreen key={String(customerId)} mode="edit-basic" customerId={Number(customerId)} />;
}
