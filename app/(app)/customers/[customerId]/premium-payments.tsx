import { useLocalSearchParams } from "expo-router";

import { PremiumPaymentsScreen } from "../../../../src/features/premium-payments/PremiumPaymentsScreen";

export default function CustomerPremiumPaymentsRoute() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const id = Number(customerId);
  return (
    <PremiumPaymentsScreen
      initialCustomerId={Number.isInteger(id) && id > 0 ? id : null}
      showBack
    />
  );
}
