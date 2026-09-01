import { useLocalSearchParams } from "expo-router";

import { CustomerMapScreen } from "../../../../src/features/customer-map/CustomerMapScreen";

export default function CustomerDetailMapRoute() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const id = Number(customerId);
  return (
    <CustomerMapScreen
      focusCustomerId={Number.isInteger(id) && id > 0 ? id : null}
      showBack
    />
  );
}
