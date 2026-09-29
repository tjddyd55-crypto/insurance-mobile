import { useLocalSearchParams } from "expo-router";
import { ClaimsScreen } from "../../../../src/features/claims/ClaimsScreen";

export default function Screen() {
  const params = useLocalSearchParams<{
    customerId: string;
    claimId?: string;
  }>();
  const claimId = Number(params.claimId);
  return (
    <ClaimsScreen
      initialCustomerId={Number(params.customerId)}
      initialClaimId={Number.isInteger(claimId) && claimId > 0 ? claimId : null}
    />
  );
}
