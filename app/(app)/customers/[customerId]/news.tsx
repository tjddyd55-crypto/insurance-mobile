import { useLocalSearchParams } from "expo-router";

import { CustomerNewsScreen } from "../../../../src/features/customer-news/CustomerNewsScreen";

export default function CustomerPersonalNewsRoute() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const id = Number(customerId);
  return (
    <CustomerNewsScreen
      initialScope="personal"
      initialCustomerId={Number.isInteger(id) && id > 0 ? id : null}
      showBack
    />
  );
}
