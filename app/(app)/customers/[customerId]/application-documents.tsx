import { useLocalSearchParams } from "expo-router";

import { ApplicationDocumentsScreen } from "../../../../src/features/application-documents/ApplicationDocumentsScreen";

export default function CustomerApplicationDocumentsRoute() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const id = Number(customerId);
  return (
    <ApplicationDocumentsScreen
      initialCustomerId={Number.isInteger(id) && id > 0 ? id : null}
      showBack
    />
  );
}
